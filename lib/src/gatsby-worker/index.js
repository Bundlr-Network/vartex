"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerPool = void 0;
const tslib_1 = require("tslib");
const node_child_process_1 = require("node:child_process");
const task_queue_1 = require("./task-queue");
const types_1 = require("./types");
const childWrapperPath = process.cwd() + `/src/gatsby-worker/child`;
class TaskInfo {
    constructor(options) {
        this.functionName = options.functionName;
        this.args = options.args;
        this.assignedToWorker = options.assignedToWorker;
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}
/**
 * Worker pool is a class that allow you to queue function execution across multiple
 * child processes, in order to parallelize work. It accepts absolute path to worker module
 * and will expose exported function of that module as properties on WorkerPool instance.
 *
 * Worker pool allows queueing execution of a function on all workers (via `.all` property)
 * as well as distributing execution across workers (via `.single` property)
 */
class WorkerPool {
    constructor(workerPath, options) {
        this.workerPath = workerPath;
        this.options = options;
        this.workerPoolPrefix = "";
        this.workers = [];
        this.taskQueue = new task_queue_1.TaskQueue();
        this.idleWorkers = new Set();
        this.listeners = [];
        this.workerPoolPrefix = options.workerPoolPrefix || "";
        const single = {};
        const all = {};
        {
            // we don't need to retain these
            Promise.resolve().then(() => tslib_1.__importStar(require(workerPath))).then((module) => {
                const exportNames = Object.keys(module);
                for (const exportName of exportNames) {
                    if (typeof module[exportName] !== `function`) {
                        // We only expose functions. Exposing other types
                        // would require additional handling which doesn't seem
                        // worth supporting given that consumers can just access
                        // those via require/import instead of WorkerPool interface.
                        continue;
                    }
                    single[exportName] = this.scheduleWorkSingle.bind(this, exportName);
                    all[exportName] = this.scheduleWorkAll.bind(this, exportName);
                }
            });
            this.single = single;
            this.all = all;
            this.startAll();
        }
    }
    startAll() {
        var _a, _b;
        const options = this.options;
        for (let workerId = 1; workerId <= ((_a = options === null || options === void 0 ? void 0 : options.numWorkers) !== null && _a !== void 0 ? _a : 1); workerId++) {
            const worker = (0, node_child_process_1.fork)(childWrapperPath, {
                cwd: process.cwd(),
                env: Object.assign(Object.assign(Object.assign({}, process.env), ((_b = options === null || options === void 0 ? void 0 : options.env) !== null && _b !== void 0 ? _b : {})), { GATSBY_WORKER_ID: workerId.toString(), GATSBY_WORKER_MODULE_PATH: this.workerPath }),
                execArgv: process.execArgv,
                silent: true,
            });
            worker.stdout.on("data", (data) => options.logFilter(data) && process.stdout.write(data + "\n"));
            worker.stderr.on("data", (data) => options.logFilter(data) && process.stdout.write(data + "\n"));
            const workerInfo = {
                workerId,
                worker,
                exitedPromise: new Promise((resolve) => {
                    worker.on(`exit`, (code, signal) => {
                        if (workerInfo.currentTask) {
                            console.error("Received code:", code, "signal:", signal);
                            // worker exited without finishing a task
                            workerInfo.currentTask.reject(new Error(`Worker exited before finishing task`));
                        }
                        // remove worker from list of workers
                        this.workers.splice(this.workers.indexOf(workerInfo), 1);
                        resolve({ code, signal });
                    });
                }),
            };
            worker.on(`message`, (message) => {
                switch (message[0]) {
                    case types_1.RESULT: {
                        if (!workerInfo.currentTask) {
                            throw new Error(`Invariant: gatsby-worker received execution result, but it wasn't expecting it.`);
                        }
                        const task = workerInfo.currentTask;
                        workerInfo.currentTask = undefined;
                        this.checkForWork(workerInfo);
                        task.resolve(message[1]);
                        break;
                    }
                    case types_1.ERROR: {
                        if (!workerInfo.currentTask) {
                            throw new Error(`Invariant: gatsby-worker received execution rejection, but it wasn't expecting it.`);
                        }
                        let error = message[4];
                        if (error !== null && typeof error === `object`) {
                            const extra = error;
                            const NativeCtor = global[message[1]];
                            const Ctor = typeof NativeCtor === `function` ? NativeCtor : Error;
                            error = new Ctor(message[2]);
                            // @ts-ignore type doesn't exist on Error, but that's what jest-worker does for errors :shrug:
                            error.type = message[1];
                            error.stack = message[3];
                            for (const key in extra) {
                                if (Object.prototype.hasOwnProperty.call(extra, key)) {
                                    error[key] = extra[key];
                                }
                            }
                        }
                        const task = workerInfo.currentTask;
                        workerInfo.currentTask = undefined;
                        this.checkForWork(workerInfo);
                        task.reject(error);
                        break;
                    }
                    case types_1.CUSTOM_MESSAGE: {
                        for (const listener of this.listeners) {
                            listener(message[1], this.workerPoolPrefix + ":" + workerId);
                        }
                        break;
                    }
                    // No default
                }
            });
            this.workers.push(workerInfo);
            this.idleWorkers.add(workerInfo);
        }
    }
    /**
     * Kills worker processes and rejects and ongoing or pending tasks.
     * @returns Array of promises for each worker that will resolve once worker did exit.
     */
    end() {
        const results = this.workers.map((workerInfo) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            // tell worker to end gracefully
            const endMessage = [types_1.END];
            workerInfo.worker.send(endMessage);
            // force exit if worker doesn't exit gracefully quickly
            const forceExitTimeout = setTimeout(() => {
                workerInfo.worker.kill(`SIGKILL`);
            }, 1000);
            const exitResult = yield workerInfo.exitedPromise;
            clearTimeout(forceExitTimeout);
            return exitResult.code;
        }));
        Promise.all(results).then(() => {
            // make sure we fail queued tasks as well
            for (const taskNode of this.taskQueue) {
                taskNode.value.reject(new Error(`Worker exited before finishing task`));
            }
            this.workers = [];
            this.idleWorkers = new Set();
        });
        return results;
    }
    /**
     * Kills all running worker processes and spawns a new pool of processes
     */
    restart() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield Promise.all(this.end());
            this.startAll();
        });
    }
    getWorkerInfo() {
        return this.workers.map((worker) => {
            return { workerId: worker.workerId };
        });
    }
    checkForWork(workerInfo) {
        // check if there is task in queue
        for (const taskNode of this.taskQueue) {
            const task = taskNode.value;
            if (!task.assignedToWorker || task.assignedToWorker === workerInfo) {
                this.doWork(task, workerInfo);
                this.taskQueue.remove(taskNode);
                return;
            }
        }
        // no task found, so just marking worker as idle
        this.idleWorkers.add(workerInfo);
    }
    doWork(taskInfo, workerInfo) {
        // block worker
        workerInfo.currentTask = taskInfo;
        this.idleWorkers.delete(workerInfo);
        const message = [
            types_1.EXECUTE,
            taskInfo.functionName,
            taskInfo.args,
        ];
        workerInfo.worker.send(message);
    }
    scheduleWork(taskInfo) {
        let workerToExecuteTaskNow;
        if (taskInfo.assignedToWorker) {
            if (this.idleWorkers.has(taskInfo.assignedToWorker)) {
                workerToExecuteTaskNow = taskInfo.assignedToWorker;
            }
        }
        else {
            workerToExecuteTaskNow = this.idleWorkers.values().next().value;
        }
        if (workerToExecuteTaskNow) {
            this.doWork(taskInfo, workerToExecuteTaskNow);
        }
        else {
            this.taskQueue.enqueue(taskInfo);
        }
        return taskInfo.promise;
    }
    scheduleWorkSingle(functionName, ...arguments_) {
        return this.scheduleWork(new TaskInfo({ functionName, args: arguments_ }));
    }
    scheduleWorkAll(functionName, ...arguments_) {
        return this.workers.map((workerInfo) => this.scheduleWork(new TaskInfo({
            assignedToWorker: workerInfo,
            functionName,
            args: arguments_,
        })));
    }
    onMessage(listener) {
        this.listeners.push(listener);
    }
    sendMessage(message, workerId) {
        // console.error("send message", msg);
        const worker = this.workers[workerId - 1];
        if (!worker) {
            throw new Error(`There is no worker with "${workerId}" id.`);
        }
        const poolMessage = [types_1.CUSTOM_MESSAGE, message];
        worker.worker.send(poolMessage);
    }
}
exports.WorkerPool = WorkerPool;
tslib_1.__exportStar(require("./child"), exports);
//# sourceMappingURL=index.js.map