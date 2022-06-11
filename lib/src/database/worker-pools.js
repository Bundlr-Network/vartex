"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ans104ImportWorkerPool = exports.ans102ImportWorkerPool = exports.manifestImportWorkerPool = exports.txsImportWorkerPool = exports.blockImportWorkerPool = exports.workerReadyPromises = void 0;
const tslib_1 = require("tslib");
require("colors");
const R = tslib_1.__importStar(require("rambda"));
const gatsby_worker_1 = require("../gatsby-worker");
const constants_1 = require("../constants");
const log_1 = require("../utility/log");
const processEnv = R.mergeAll([
    {
        PWD: process.cwd(),
        TS_NODE_FILES: true,
        NODE_PATH: process.cwd() + "/node_modules",
        NODE_OPTIONS: `--require ${process.cwd() + "/node_modules/ts-node/register"}`,
    },
    process.env,
]);
function logFilter(data) {
    return (!/ExperimentalWarning:/.test(data) && !/node --trace-warnings/.test(data));
}
exports.workerReadyPromises = {};
function appendWorkerReadyPromises(workerPoolPrefix, workerCount) {
    for (const workerIndex of R.range(1, workerCount + 1)) {
        let resolve;
        const promise = new Promise((resolve_) => {
            resolve = resolve_;
        });
        exports.workerReadyPromises[workerPoolPrefix + ":" + workerIndex] = {
            promise,
            resolve,
        };
    }
}
function onWorkerMessage(message, workerId) {
    switch (message.type) {
        case "worker:ready": {
            exports.workerReadyPromises[workerId].resolve();
            break;
        }
        case "log:info": {
            if (message.message && message.message !== "{}") {
                log_1.log.info(`[${workerId}] ${message.message}`.blue);
            }
            break;
        }
        case "log:warn": {
            if (message.message && message.message !== "{}") {
                log_1.log.info(`[${workerId}] ${message.message}`.yellow);
            }
            break;
        }
        case "log:error": {
            if (message.message && message.message !== "{}") {
                log_1.log.info(`[${workerId}] ${message.message}`.red);
            }
            break;
        }
        default: {
            log_1.log.error("[${workerId}] unknown worker message arrived".yellow, message);
        }
    }
}
appendWorkerReadyPromises("import-block", constants_1.env.PARALLEL_BLOCK_IMPORT + 1);
exports.blockImportWorkerPool = new gatsby_worker_1.WorkerPool(process.cwd() + "/src/workers/main", {
    workerPoolPrefix: "import-block",
    numWorkers: constants_1.env.PARALLEL_BLOCK_IMPORT + 1,
    logFilter,
    env: processEnv,
});
appendWorkerReadyPromises("import-txs", constants_1.env.PARALLEL_TX_IMPORT + 1);
exports.txsImportWorkerPool = new gatsby_worker_1.WorkerPool(process.cwd() + "/src/workers/main", {
    workerPoolPrefix: "import-txs",
    numWorkers: constants_1.env.PARALLEL_TX_IMPORT + 1,
    logFilter,
    env: processEnv,
});
appendWorkerReadyPromises("import-manifest", constants_1.env.PARALLEL_MANIFEST_IMPORT + 1);
exports.manifestImportWorkerPool = new gatsby_worker_1.WorkerPool(process.cwd() + "/src/workers/main", {
    workerPoolPrefix: "import-manifest",
    numWorkers: constants_1.env.PARALLEL_MANIFEST_IMPORT + 1,
    logFilter,
    env: processEnv,
});
appendWorkerReadyPromises("import-ans102", constants_1.env.PARALLEL_ANS102_IMPORT + 1);
exports.ans102ImportWorkerPool = new gatsby_worker_1.WorkerPool(process.cwd() + "/src/workers/main", {
    workerPoolPrefix: "import-ans102",
    numWorkers: constants_1.env.PARALLEL_ANS102_IMPORT + 1,
    logFilter,
    env: processEnv,
});
appendWorkerReadyPromises("import-ans104", constants_1.env.PARALLEL_ANS104_IMPORT + 1);
exports.ans104ImportWorkerPool = new gatsby_worker_1.WorkerPool(process.cwd() + "/src/workers/main", {
    workerPoolPrefix: "import-ans104",
    numWorkers: constants_1.env.PARALLEL_ANS104_IMPORT + 1,
    logFilter,
    env: processEnv,
});
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
exports.blockImportWorkerPool.onMessage(onWorkerMessage);
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
exports.txsImportWorkerPool.onMessage(onWorkerMessage);
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
exports.manifestImportWorkerPool.onMessage(onWorkerMessage);
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
exports.ans102ImportWorkerPool.onMessage(onWorkerMessage);
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
exports.ans104ImportWorkerPool.onMessage(onWorkerMessage);
//# sourceMappingURL=worker-pools.js.map