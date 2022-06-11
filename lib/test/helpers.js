"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupTestNode = exports.runGatewayOnce = exports.startGateway = exports.generateMockBlocks = exports.generateRandomMockTxs = exports.initDb = exports.killPortAndWait = exports.waitForCassandra = void 0;
const tslib_1 = require("tslib");
const R = tslib_1.__importStar(require("rambda"));
const express_1 = tslib_1.__importDefault(require("express"));
const net_1 = tslib_1.__importDefault(require("net"));
const path_1 = tslib_1.__importDefault(require("path"));
const kill_port_1 = tslib_1.__importDefault(require("kill-port"));
const child_process_1 = tslib_1.__importStar(require("child_process"));
const setup_1 = require("./setup");
const PORT = parseInt(process.env.PORT);
function waitForCassandra() {
    return new Promise((resolve, reject) => {
        const maxRetry = 100;
        let rtry = 0;
        // Wait until cassandra is reachable
        const retry = () => {
            const client = net_1.default
                .createConnection(9042, "127.0.0.1")
                .on("error", function (error) {
                rtry += 1;
                if (rtry < maxRetry) {
                    new Promise((resolveRetry) => setTimeout(resolveRetry, 1000)).then(retry);
                }
                else {
                    throw new Error("Couldn't find cassandra running after 100 retries: " + error);
                }
            })
                .on("connect", function () {
                try {
                    client.destroy();
                    // eslint-disable-next-line no-empty
                }
                catch (error) { }
                resolve();
            });
        };
        retry();
    });
}
exports.waitForCassandra = waitForCassandra;
const retryPort = (port, retry = 0) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const maxRetry = 100;
    return yield new Promise((resolve) => {
        const client = net_1.default
            .createConnection(port, "127.0.0.1", () => {
            if (retry < maxRetry) {
                new Promise((resolveRetry) => setTimeout(resolveRetry, 1)).then(() => {
                    return retryPort(port, retry + 1);
                    try {
                        client.destroy();
                        // eslint-disable-next-line no-empty
                    }
                    catch (error) { }
                });
            }
            else {
                // throw new Error(`Couldn't kill port ${port}`);
                resolve();
            }
        })
            .on("error", function (error) {
            try {
                client.destroy();
                // eslint-disable-next-line no-empty
            }
            catch (error) { }
            resolve();
        });
    });
});
function killPortAndWait(port) {
    return new Promise((resolve, reject) => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield (0, kill_port_1.default)(port);
        yield retryPort(port);
        resolve();
    }));
}
exports.killPortAndWait = killPortAndWait;
function initDb() {
    return new Promise((resolve, reject) => {
        // let invoked = false;
        const forkps = (0, child_process_1.fork)(path_1.default.resolve("./", "cassandra/init.cjs"), {
            env: process.env,
        });
        // listen for errors as they may prevent the exit event from firing
        forkps.on("error", function (err) {
            // if (invoked) return;
            // invoked = true;
            reject((err || "").toString());
        });
        // execute the callback once the forkps has finished running
        forkps.on("exit", function (code) {
            // if (invoked) return;
            // invoked = true;
            const err = code === 0 ? null : new Error("exit code " + code);
            resolve((err || "").toString());
        });
    });
}
exports.initDb = initDb;
function randomString(length) {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
function generateRandomMockTxs() {
    const template = {
        data: "",
        id: "",
        last_tx: "",
        owner: "",
        quantity: 0,
        reward: 0,
        signature: "",
        tags: [],
        target: "",
    };
    const txsRange = R.range(0, Math.floor(Math.random() * 10));
    const txs = txsRange.reduce(({ lastId, acc }) => {
        const nextId = randomString(43);
        const tagsRange = R.range(0, Math.floor(Math.random() * 10));
        const nextTx = R.pipe(R.assoc("id", nextId), R.assoc("last_tx", lastId), R.assoc("reward", Math.floor(Math.random() * 1000)), R.assoc("quantity", Math.floor(Math.random() * 1000)), R.assoc("tags", tagsRange.map(() => ({
            name: randomString(20),
            value: randomString(20),
        }))))(template);
        return { lastId: nextId, acc: R.append(nextTx, acc) };
    }, { lastId: "", acc: [] });
    return txs.acc;
}
exports.generateRandomMockTxs = generateRandomMockTxs;
function generateMockBlocks({ totalBlocks, offset = 0, hashPrefix = "x", }) {
    const template = {
        nonce: "n1",
        previous_block: hashPrefix,
        timestamp: 1,
        last_retarget: 1,
        diff: "1111",
        height: 0,
        hash: "_____x",
        indep_hash: hashPrefix,
        txs: [],
        tx_root: "root1",
        wallet_list: "wl1",
        reward_addr: "xyz1",
        tags: [],
        reward_pool: "123",
        weave_size: "123",
        block_size: "123",
        cumulative_diff: "123",
        hash_list_merkle: "xxx",
    };
    const blockHeights = R.range(offset, offset + totalBlocks);
    let txs = [];
    const blocks = blockHeights.map((height) => {
        const thisTxs = generateRandomMockTxs();
        txs = R.concat(txs, thisTxs);
        return R.pipe(R.assoc("height", height), R.assoc("indep_hash", `${hashPrefix}${height}`), R.assoc("previous_block", `${hashPrefix}${height - 1}`), R.assoc("txs", thisTxs.map((tx) => tx.id)))(template);
    });
    return { blocks, txs };
}
exports.generateMockBlocks = generateMockBlocks;
function startGateway() {
    return child_process_1.default.spawn("node", [
        "--experimental-specifier-resolution=node",
        "--max-old-space-size=4096",
        "--loader=ts-node/esm.mjs",
        "src/gateway.ts",
    ], {
        env: setup_1.testEnvVars,
    });
}
exports.startGateway = startGateway;
function runGatewayOnce({ onLog, stopCondition, }) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const logs = [];
        let fullySyncPromiseResolve;
        const shouldStop = (log) => stopCondition
            ? stopCondition(log.toString())
            : /fully synced db/g.test(log.toString()) ||
                /import queues have been consumed/g.test(log.toString());
        let proc = startGateway();
        proc.stderr.on("data", (log) => {
            if (shouldStop(log) && fullySyncPromiseResolve) {
                setTimeout(() => {
                    fullySyncPromiseResolve();
                    fullySyncPromiseResolve = undefined;
                }, 0);
            }
            logs.push(log);
            process.stderr.write(log);
            onLog && onLog(log);
        });
        proc.stdout.on("data", (log) => {
            if (shouldStop(log) && fullySyncPromiseResolve) {
                setTimeout(fullySyncPromiseResolve, 0);
            }
            process.stderr.write(log);
            logs.push(log);
            onLog && onLog(log);
            // logs = ' ' + log.toString();
        });
        return yield new Promise((resolve, reject) => {
            fullySyncPromiseResolve = () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                if (proc) {
                    proc.kill("SIGINT");
                    proc = undefined;
                }
                yield (0, kill_port_1.default)(PORT);
                yield new Promise((res_) => setTimeout(res_, 0));
                resolve(logs.join(" "));
            });
        });
    });
}
exports.runGatewayOnce = runGatewayOnce;
function setupTestNode(appState) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const app = (0, express_1.default)();
        app.get("/hash_list", function (req, res) {
            res
                .status(200)
                .json(R.reverse(R.pluck("indep_hash", appState.get("mockBlocks"))));
        });
        app.get("/info", function (req, res) {
            res.status(200).json({
                height: appState.get("lastBlockHeight"),
                current: appState.get("lastBlockHash"),
            });
        });
        app.get("/block/height/:id", function (req, res) {
            const match = R.find(R.propEq("height", parseInt(req.params.id)))(appState.get("mockBlocks"));
            if (match) {
                res.status(200).json(match);
            }
            else {
                res.status(404);
            }
        });
        app.get("/block/hash/:id", function (req, res) {
            const match = R.find(R.propEq("indep_hash", req.params.id))(appState.get("mockBlocks"));
            if (match) {
                res.status(200).json(match);
            }
            else {
                res.status(404);
            }
        });
        app.get("/tx/:id", function (req, res) {
            const match = R.find(R.propEq("id", req.params.id))(appState.get("mockTxs"));
            if (match) {
                res.status(200).json(match);
            }
            else {
                res.status(404);
            }
        });
        app.get("*", function (req, res) {
            res.status(404);
        });
        const srv = app.listen(12345);
        return { app, srv };
    });
}
exports.setupTestNode = setupTestNode;
//# sourceMappingURL=helpers.js.map