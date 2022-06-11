"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consumeQueueOnce = exports.importTx = exports.insertGqlTag = void 0;
const tslib_1 = require("tslib");
const R = tslib_1.__importStar(require("rambda"));
const p_queue_1 = tslib_1.__importDefault(require("p-queue"));
const cassandra_driver_1 = require("cassandra-driver");
const transaction_1 = require("../query/transaction");
const encoding_1 = require("../utility/encoding");
const mapper_1 = require("../database/mapper");
const utils_1 = require("../database/utils");
const child_1 = require("../gatsby-worker/child");
const log_1 = require("../utility/log");
const constants_1 = require("../constants");
const tags_mapper_1 = require("../database/tags-mapper");
var TxReturnCode;
(function (TxReturnCode) {
    TxReturnCode[TxReturnCode["OK"] = 0] = "OK";
    TxReturnCode[TxReturnCode["REQUEUE"] = 1] = "REQUEUE";
    TxReturnCode[TxReturnCode["DEQUEUE"] = 2] = "DEQUEUE";
})(TxReturnCode || (TxReturnCode = {}));
let messenger = (0, child_1.getMessenger)();
if (messenger) {
    messenger.sendMessage({
        type: "worker:ready",
    });
}
else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messenger = { sendMessage: console.log };
}
const log = (0, log_1.mkWorkerLog)(messenger);
const concurrency = constants_1.env.PARALLEL_TX_IMPORT;
const queue = new p_queue_1.default({ concurrency });
const commonFields = ["tx_index", "data_item_index", "tx_id"];
const insertGqlTag = (tx) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    if (!R.isEmpty(tx.tags)) {
        for (const tagModelName of Object.keys(tags_mapper_1.tagModels)) {
            const tagMapper = mapper_1.tagsMapper.forModel(tagModelName);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any,unicorn/prefer-spread
            const allFields = R.concat(commonFields, tags_mapper_1.tagModels[tagModelName]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const environment = R.pickAll(allFields, tx);
            // until ans104 comes
            if (!environment["data_item_index"]) {
                environment["data_item_index"] = (0, utils_1.toLong)(-1);
            }
            if (typeof environment.owner === "string" &&
                environment.owner.length > 43) {
                environment.owner = (0, encoding_1.ownerToAddress)(environment.owner);
            }
            let index = 0;
            for (const { name, value } of tx.tags) {
                const [tag_name, tag_value] = [name, value];
                const insertObject = R.merge(environment, {
                    tag_pair: `${tag_name}|${tag_value}`,
                    tag_index: index,
                });
                yield tagMapper.insert(insertObject);
                index += 1;
            }
        }
    }
});
exports.insertGqlTag = insertGqlTag;
const importTx = (txId, blockHash) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const block = yield (0, mapper_1.blockMapper)({ indep_hash: blockHash });
    if (!block) {
        log(`blockHash ${blockHash} has not been imported (or was removed?), therefore not importing ${txId}`);
        return TxReturnCode.REQUEUE;
    }
    if (!block.txs.includes(txId)) {
        log(`Abandoned tx detected? It was not found in txs of block ${blockHash}, therefore dequeue-ing ${txId}`);
        return TxReturnCode.DEQUEUE;
    }
    // check if it's already imported, or is attached to abandoned fork
    const maybeImportedTx = yield mapper_1.transactionMapper.get({ txId });
    if (maybeImportedTx) {
        if (maybeImportedTx.block_hash === blockHash) {
            log(`Already imported transaction ${txId}! If you want to force a re-import, please remove the old one first.`);
            return TxReturnCode.DEQUEUE;
        }
        else {
            log(`Misplaced transaction ${txId}! Perhaps block with hash ${maybeImportedTx.block_hash} was abandoned?\n` +
                `Moving on to import the tx to block ${blockHash} at height ${block.height}`);
            return TxReturnCode.DEQUEUE;
        }
    }
    const tx = yield (0, transaction_1.getTransaction)({ txId });
    if (!tx) {
        log(`Failed to fetch ${txId} from nodes`);
        return TxReturnCode.REQUEUE;
    }
    const dataSize = (0, utils_1.toLong)(tx.data_size);
    let offset;
    if (dataSize && dataSize.gt(0)) {
        const maybeTxOffset = yield (0, transaction_1.getTxOffset)({ txId });
        if (!maybeTxOffset) {
            log(`Failed to fetch data offset for ${txId} from nodes`);
            return TxReturnCode.REQUEUE;
        }
        else {
            try {
                offset = maybeTxOffset.offset;
                // await txOffsetMapper.insert({
                //   tx_id: txId,
                //   size: maybeTxOffset.size,
                //   offset: maybeTxOffset.offset,
                // });
            }
            catch (error) {
                log(JSON.stringify(error));
                return TxReturnCode.REQUEUE;
            }
        }
    }
    const txIndex = block.height
        .multiply(1000)
        .add(block.txs.indexOf(txId));
    let tags = [];
    if (!R.isEmpty(tx.tags) && Array.isArray(tx.tags)) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        tags = tx.tags.map(({ name, value }) => cassandra_driver_1.types.Tuple.fromArray([name, value]));
    }
    try {
        yield (0, exports.insertGqlTag)(tx);
    }
    catch (error) {
        log(JSON.stringify(error));
        return TxReturnCode.REQUEUE;
    }
    try {
        yield (0, utils_1.insertTx)({
            tx_index: txIndex,
            data_item_index: (0, utils_1.toLong)(-1),
            block_height: block.height,
            block_hash: block.indep_hash,
            bundled_in: null /* eslint-disable-line unicorn/no-null */,
            data_root: tx.data_root,
            offset: (0, utils_1.toLong)(offset),
            data_size: (0, utils_1.toLong)(tx.data_size),
            data_tree: tx.data_tree || [],
            format: tx.format,
            tx_id: tx.id,
            last_tx: tx.last_tx,
            owner: tx.owner,
            quantity: (0, utils_1.toLong)(tx.quantity),
            reward: (0, utils_1.toLong)(tx.reward),
            signature: tx.signature,
            tags,
            tag_count: tags.length,
            target: tx.target,
        });
    }
    catch (error) {
        log(JSON.stringify(error));
        return TxReturnCode.REQUEUE;
    }
    return TxReturnCode.DEQUEUE;
});
exports.importTx = importTx;
let workerIsWorking = false;
function consumeQueueOnce() {
    var e_1, _a;
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (!workerIsWorking) {
            workerIsWorking = true;
            const result = yield mapper_1.cassandraClient.execute(`SELECT * FROM ${constants_1.KEYSPACE}.tx_queue`, [], { prepare: true });
            try {
                for (var result_1 = tslib_1.__asyncValues(result), result_1_1; result_1_1 = yield result_1.next(), !result_1_1.done;) {
                    const pendingTx = result_1_1.value;
                    const callback = () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                        const txImportResult = yield (0, exports.importTx)(pendingTx.tx_id, pendingTx.block_hash);
                        switch (txImportResult) {
                            case TxReturnCode.OK: {
                                try {
                                    yield mapper_1.txQueueMapper.remove({ tx_id: pendingTx.tx_id });
                                }
                                catch (error) {
                                    log(`tx was imported but encountered error while dequeue-ing ${JSON.stringify(error)}`);
                                }
                                finally {
                                    log(`${pendingTx.tx_id} successfully imported!`);
                                }
                                break;
                            }
                            case TxReturnCode.DEQUEUE: {
                                try {
                                    yield mapper_1.txQueueMapper.remove({ tx_id: pendingTx.tx_id });
                                }
                                catch (_b) {
                                    /* logs should've been printed already */
                                }
                                break;
                            }
                            default: {
                                try {
                                    yield mapper_1.txQueueMapper.update({
                                        tx_id: pendingTx.tx_id,
                                        last_import_attempt: cassandra_driver_1.types.LocalTime.now(),
                                        import_attempt_cnt: (pendingTx.import_attempt_cnt || 0) + 1,
                                    });
                                }
                                catch (error) {
                                    log(`Error encountered while requeue-ing a tx ${JSON.stringify(error)}`);
                                }
                            }
                        }
                    });
                    queue.add(callback);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (result_1_1 && !result_1_1.done && (_a = result_1.return)) yield _a.call(result_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            yield queue.onIdle();
            workerIsWorking = false;
        }
        else {
            log(`Can't consume queue while worker is still consuming`);
        }
    });
}
exports.consumeQueueOnce = consumeQueueOnce;
//# sourceMappingURL=import-tx.js.map