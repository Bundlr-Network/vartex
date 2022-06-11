"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSync = exports.currentHeight = exports.topHeight = exports.gatewayHeight = exports.topHash = void 0;
const tslib_1 = require("tslib");
const R = tslib_1.__importStar(require("rambda"));
// import pWaitFor from "p-wait-for";
const p_min_delay_1 = tslib_1.__importDefault(require("p-min-delay"));
const p_whilst_1 = tslib_1.__importDefault(require("p-whilst"));
const p_limit_1 = tslib_1.__importDefault(require("p-limit"));
const exit_hook_1 = tslib_1.__importDefault(require("exit-hook"));
const gauge_1 = tslib_1.__importDefault(require("gauge"));
const constants_1 = require("../constants");
const log_1 = require("../utility/log");
const node_1 = require("../query/node");
const block_1 = require("../query/block");
const cassandra_1 = require("./cassandra");
const mapper_1 = require("./mapper");
const utils_1 = require("./utils");
const worker_pools_1 = require("./worker-pools");
const Dr = tslib_1.__importStar(require("./doctor"));
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
let session_;
const currentImports = new Set();
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
// const messagePromiseReceivers: Record<string, any> = {};
// export const txInFlight: Record<string, number> = {};
// const numberOr0 = (n: number | undefined): number => (Number.isNaN(n) ? 0 : n);
// export const getTxsInFlight = (): number =>
//   Object.values(txInFlight).reduce((a, b) => numberOr0(a) + numberOr0(b));
exports.topHash = "";
exports.gatewayHeight = (0, utils_1.toLong)(0);
exports.topHeight = 0;
exports.currentHeight = 0;
const developmentSyncLength = !process.env["DEVELOPMENT_SYNC_LENGTH"] ||
    R.isEmpty(process.env["DEVELOPMENT_SYNC_LENGTH"])
    ? undefined
    : Number.parseInt(process.env["DEVELOPMENT_SYNC_LENGTH"]);
// eslint-disable-next-line use-isnan
if (developmentSyncLength === Number.NaN) {
    console.error("Development sync range variable produced, illegal value NaN");
    process.exit(1);
}
let isPollingStarted = false;
let isPaused = false;
function resolveFork(previousBlock) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        isPaused = true;
        const pprevBlock = yield (0, block_1.fetchBlockByHash)(previousBlock.previous_block);
        const blockQueryResult = yield cassandra_1.cassandraClient.execute(`SELECT height FROM ${constants_1.KEYSPACE}.block WHERE indep_hash=?`, [pprevBlock.indep_hash]);
        if (blockQueryResult.rowLength > 0) {
            log_1.log.info("fork diverges at " + blockQueryResult.rows[0].height.toString());
            // if (getTxsInFlight() > 0) {
            //   log.info(
            //     "waiting for " + getTxsInFlight() + " txs in flight to settle..."
            //   );
            //   await pWaitFor(() => getTxsInFlight() === 0, { interval: 200 });
            // }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const result = yield cassandra_1.cassandraClient.execute(`SELECT block_height,block_hash
       FROM ${constants_1.KEYSPACE}.block_height_to_hash
       WHERE block_height > ${blockQueryResult.rows[0].height.toString()}
       ALLOW FILTERING`, [], { prepare: true });
            log_1.log.info(`[fork recovery] abandoned blocks removal done, re-importing missing blocks...`);
            const nodeInfo = yield (0, node_1.getNodeInfo)({});
            for (const newForkHeight of R.range(blockQueryResult.rows[0].height.toInt() + 1, typeof nodeInfo.height === "number"
                ? nodeInfo.height
                : Number.parseInt(nodeInfo.height))) {
                yield worker_pools_1.blockImportWorkerPool.single.importBlock(newForkHeight);
            }
            log_1.log.info(`[fork recovery] all done!`);
        }
        else {
            return yield resolveFork(pprevBlock);
        }
    });
}
let poller;
let exited = false;
(0, exit_hook_1.default)(() => {
    exited = true;
});
const pollNewBlocks = () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    if (isPaused)
        return;
    if (!isPollingStarted && !poller) {
        isPollingStarted = true;
        poller = (0, p_whilst_1.default)(() => !exited, () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
            try {
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                yield p_min_delay_1.default(yield pollNewBlocks(), 120 * 1000);
            }
            catch (error) {
                console.error(error);
            }
        }));
        log_1.log.info("[sync] polling for new incoming blocks..");
    }
    const nodeInfo = yield (0, node_1.getNodeInfo)({});
    if (!nodeInfo) {
        return;
    }
    exports.topHeight = nodeInfo.height;
    [exports.topHash, exports.gatewayHeight] = yield (0, utils_1.getMaxHeightBlock)(cassandra_1.cassandraClient);
    mapper_1.statusMapper.update({
        session: session_.uuid,
        gateway_height: `${exports.gatewayHeight}`,
        arweave_height: `${exports.topHeight}`,
    });
    if (nodeInfo.current !== exports.topHash) {
        const currentRemoteBlock = yield (0, block_1.fetchBlockByHash)(nodeInfo.current);
        const previousBlock = yield (0, block_1.fetchBlockByHash)(currentRemoteBlock.previous_block);
        // fork recovery
        if (previousBlock.indep_hash !== exports.topHash) {
            log_1.log.info("blocks out of sync with the remote node " +
                previousBlock.indep_hash +
                "!= " +
                exports.topHash);
            yield resolveFork(currentRemoteBlock);
            isPaused = false;
            log_1.log.info("blocks are back in sync!");
        }
        else {
            yield worker_pools_1.blockImportWorkerPool.single.importBlock(nodeInfo.height);
        }
    }
});
function detectFirstRun() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const queryResponse = yield cassandra_1.cassandraClient.execute(`SELECT height
     FROM ${constants_1.KEYSPACE}.block LIMIT 1`);
        return queryResponse && queryResponse.rowLength > 0 ? false : true;
    });
}
function findMissingBlocks(hashList) {
    var e_1, _a;
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const hashListObject = hashList.reduce((accumulator, hash, height) => {
            accumulator[height] = { height, hash };
            return accumulator;
        }, {});
        log_1.log.info("[database] Looking for missing blocks...");
        const result = yield cassandra_1.cassandraClient.execute(`SELECT height, indep_hash, timestamp, txs
         FROM ${constants_1.KEYSPACE}.block`, [], { prepare: true, executionProfile: "fast" });
        try {
            for (var result_1 = tslib_1.__asyncValues(result), result_1_1; result_1_1 = yield result_1.next(), !result_1_1.done;) {
                const rowResult = result_1_1.value;
                const matchingRow = hashListObject[rowResult.height.toString()];
                if (matchingRow &&
                    R.equals(matchingRow["hash"], rowResult.indep_hash) &&
                    R.equals(matchingRow["height"], rowResult.height)) {
                    delete hashListObject[rowResult.height];
                }
                else {
                    if (!matchingRow) {
                        log_1.log.info(`Found missing block: ${rowResult.height}`);
                    }
                    else if (!R.equals(matchingRow["height"], rowResult.height)) {
                        log_1.log.info(`Found mismatching block at: ${rowResult.height} because ${matchingRow["height"]} != ${rowResult.height}`);
                    }
                    else if (!R.equals(matchingRow["hash"], rowResult.indep_hash)) {
                        log_1.log.info(`Found mismatching block at: ${rowResult.height} because ${matchingRow["hash"]} != ${rowResult.indep_hash}`);
                    }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (result_1_1 && !result_1_1.done && (_a = result_1.return)) yield _a.call(result_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return R.sortBy(R.prop("height"))(R.values(hashListObject));
    });
}
function startGatewayNodeMode() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // TODO: read stats from cassandra
        [exports.topHash, exports.gatewayHeight] = yield (0, utils_1.getMaxHeightBlock)(cassandra_1.cassandraClient);
    });
}
function startManifestImportWorker() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            yield p_min_delay_1.default(worker_pools_1.manifestImportWorkerPool.single.importManifests(), 120 * 1000);
        }
        catch (error) {
            console.error(error);
        }
        return yield startManifestImportWorker();
    });
}
function startSync({ session, }) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        session_ = session;
        if (constants_1.isGatewayNodeModeEnabled) {
            log_1.log.info("[sync] vartex gateway-node mode is enabled so no syncing will be performed (aka read-only mode)");
            yield startGatewayNodeMode();
            return;
        }
        // wait until worker threads are ready
        yield Promise.all(R.map(R.prop("promise"))(R.values(worker_pools_1.workerReadyPromises)));
        const hashList = yield (0, node_1.getHashList)({});
        exports.topHeight = hashList.length;
        const firstRun = yield detectFirstRun();
        let lastBlock = (0, utils_1.toLong)(-1);
        try {
            const result_ = yield (0, utils_1.getMaxHeightBlock)(cassandra_1.cassandraClient);
            lastBlock = result_[1];
        }
        catch (_a) { }
        if (!firstRun && !developmentSyncLength) {
            const isMaybeMissingBlocks = yield Dr.checkForBlockGaps(lastBlock);
            if (isMaybeMissingBlocks) {
                const blockGap = yield Dr.findBlockGaps(lastBlock);
                if (!R.isEmpty(blockGap)) {
                    console.error("Repairing missing block(s):", blockGap);
                    yield Promise.all(blockGap.map((height) => worker_pools_1.blockImportWorkerPool.single.importBlock(height)));
                }
                try {
                    const result_ = yield (0, utils_1.getMaxHeightBlock)(cassandra_1.cassandraClient);
                    lastBlock = result_[1];
                }
                catch (_b) { }
            }
        }
        const gauge = new gauge_1.default(process.stderr, {
            template: [
                { type: "progressbar", length: 0 },
                { type: "activityIndicator", kerning: 1, length: 2 },
                { type: "section", kerning: 1, default: "" },
                { type: "subsection", kerning: 1, default: "" },
            ],
            theme: {
                hasUnicode: false,
                hasColor: true,
            },
        });
        let unsyncedBlocks = firstRun
            ? hashList.map((hash, height) => ({ hash, height }))
            : yield findMissingBlocks(hashList);
        const initialLastBlock = (0, utils_1.toLong)(unsyncedBlocks[0] ? unsyncedBlocks[0].height : 0);
        if (developmentSyncLength) {
            unsyncedBlocks = R.slice(developmentSyncLength, unsyncedBlocks.length, unsyncedBlocks);
            // initialLastBlock = toLong(developmentSyncLength).sub(1);
            exports.gatewayHeight = initialLastBlock;
            mapper_1.statusMapper.update({
                session: session.uuid,
                gateway_height: `${exports.gatewayHeight}`,
            });
        }
        else {
            exports.gatewayHeight = lastBlock;
            mapper_1.statusMapper.update({
                session: session.uuid,
                gateway_height: `${lastBlock}`,
            });
        }
        // wait a minute until starting to poll for unimported manifest
        !constants_1.env.OFFLOAD_MANIFEST_IMPORT &&
            setTimeout(startManifestImportWorker, 60 * 1000);
        if (firstRun) {
            log_1.log.info("[sync] database seems to be empty, starting preperations for import...");
        }
        else if (R.isEmpty(unsyncedBlocks)) {
            log_1.log.info("[sync] fully synced db");
            pollNewBlocks();
            return;
        }
        else {
            log_1.log.info(`[sync] missing ${unsyncedBlocks.length} blocks, starting sync...`);
        }
        gauge.enable();
        const limit = (0, p_limit_1.default)(2);
        const importBlocksJob = unsyncedBlocks.map(({ height }) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return limit(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
                mapper_1.statusMapper.update({
                    session: session.uuid,
                    current_imports: [...currentImports].map((x) => `${x}`),
                });
                currentImports.add(height);
                yield worker_pools_1.blockImportWorkerPool.single.importBlock(height);
                currentImports.delete(height);
                exports.currentHeight = Math.max(exports.currentHeight, height);
                mapper_1.statusMapper.update({
                    session: session.uuid,
                    status: "OK",
                    gateway_height: `${exports.currentHeight}`,
                    arweave_height: `${exports.topHeight}`,
                    current_imports: [...currentImports].map((x) => `${x}`),
                });
                gauge.show(`blocks: ${exports.currentHeight}/${exports.topHeight}\t tx: FIXME`);
            }));
        }));
        yield Promise.all(importBlocksJob);
        log_1.log.info("Database fully in sync with block_list");
        !isPollingStarted && pollNewBlocks();
    });
}
exports.startSync = startSync;
//# sourceMappingURL=sync.js.map