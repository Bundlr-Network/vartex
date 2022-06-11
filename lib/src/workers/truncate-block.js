"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.truncateBlock = void 0;
const tslib_1 = require("tslib");
const R = tslib_1.__importStar(require("rambda"));
const encoding_1 = require("../utility/encoding");
const tags_mapper_1 = require("../database/tags-mapper");
const txs_mapper_1 = require("../database/txs-mapper");
const mapper_1 = require("./mapper");
const utils_1 = require("../database/utils");
const child_1 = require("../gatsby-worker/child");
const log_1 = require("../utility/log");
var TruncateBlockReturnCode;
(function (TruncateBlockReturnCode) {
    TruncateBlockReturnCode[TruncateBlockReturnCode["OK"] = 0] = "OK";
    TruncateBlockReturnCode[TruncateBlockReturnCode["REQUEUE"] = 1] = "REQUEUE";
    TruncateBlockReturnCode[TruncateBlockReturnCode["DEQUEUE"] = 2] = "DEQUEUE";
})(TruncateBlockReturnCode || (TruncateBlockReturnCode = {}));
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
function truncateBlock(blockHash) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const abandonedBlock = yield mapper_1.blockMapper.get({
            indep_hash: blockHash,
        });
        try {
            // dequeue it right away
            yield mapper_1.blockQueueMapper.remove({
                block_hash: blockHash,
                block_height: abandonedBlock.height,
            });
            log(`block import of ${blockHash} was dequeued`);
        }
        catch (_a) { }
        if (!abandonedBlock) {
            log(`block truncation of ${blockHash}. The block wasn't ever imported, dequeing...`);
            return TruncateBlockReturnCode.DEQUEUE;
        }
        const blockHashMapperResult = yield mapper_1.blockHeightToHashMapper.get({
            block_height: abandonedBlock.height,
        });
        // this table is ambigious about block hashes, so we remove it only if the hash matches
        if (blockHashMapperResult && blockHashMapperResult.block_hash === blockHash) {
            try {
                yield mapper_1.blockHeightToHashMapper.get({
                    block_height: abandonedBlock.height,
                });
            }
            catch (_b) { }
        }
        if (abandonedBlock && !R.isEmpty(abandonedBlock.txs)) {
            let index = -1;
            for (const abandonedTx of abandonedBlock.txs) {
                index += 1;
                const txIndex = (0, utils_1.toLong)(abandonedBlock.height).mul(1000).add(index);
                const nthMillion = txIndex.div(1e6).toInt();
                try {
                    yield mapper_1.txsSortedAscMapper.remove({
                        nth_million: nthMillion,
                        tx_id: abandonedTx,
                        tx_index: txIndex,
                        data_item_index: -1,
                    });
                }
                catch (_c) { }
                try {
                    yield mapper_1.txsSortedDescMapper.remove({
                        nth_million: nthMillion,
                        tx_id: abandonedTx,
                        tx_index: txIndex,
                        data_item_index: -1,
                    });
                }
                catch (_d) { }
                try {
                    yield mapper_1.txOffsetMapper.remove({ tx_id: abandonedTx });
                }
                catch (_e) { }
                const tx = yield mapper_1.transactionMapper.get({ tx_id: abandonedTx });
                if (tx && tx.tags && Array.isArray(tx.tags) && !R.isEmpty(tx.tags)) {
                    const abandonedTxTags = tx.tags.map((t) => t.values());
                    const isManifest = hasManifestContentType(abandonedTxTags);
                    let tagIndex = -1;
                    for (const abandonedTag of abandonedTxTags) {
                        tagIndex += 1;
                        const [tagName, tagValue] = abandonedTag;
                        const owner = (0, encoding_1.ownerToAddress)(tx.owner);
                        const tagDropParameters = {
                            tagName,
                            tagValue,
                            owner,
                            bundledIn: tx.bundled_in,
                            dataItemIndex: -1,
                            dataRoot: tx.data_root,
                            tagIndex: `${tagIndex}`,
                            target: tx.target,
                            txId: tx.tx_id,
                            txIndex,
                        };
                        yield mapper_1.cassandraClient.exec((0, tags_mapper_1.dropTagQuery)(tagDropParameters));
                    }
                    if (isManifest) {
                        const maybeManifest = yield mapper_1.manifestMapper.get({
                            tx_id: abandonedTx.tx_id,
                        });
                        if (maybeManifest) {
                            const manifestPaths = JSON.parse(maybeManifest.manifest_paths);
                            const manifestFiles = Object.keys(manifestPaths);
                            if (manifestFiles.includes(maybeManifest.manifest_index)) {
                                try {
                                    yield mapper_1.permawebPathMapper.remove({
                                        domain_id: abandonedTx.tx_id,
                                        uri_path: "",
                                    });
                                }
                                catch (_f) { }
                            }
                            for (const manifestFile of manifestFiles) {
                                try {
                                    yield mapper_1.permawebPathMapper.remove({
                                        domain_id: abandonedTx.tx_id,
                                        uri_path: escape(manifestFile),
                                    });
                                }
                                catch (_g) { }
                            }
                        }
                        try {
                            yield mapper_1.manifestQueueMapper.remove({ tx_id: abandonedTx.tx_id }, { ifExists: true });
                        }
                        catch (_h) { }
                    }
                }
                if (tx) {
                    try {
                        yield mapper_1.transactionMapper.remove({ tx_id: abandonedTx });
                    }
                    catch (_j) { }
                    const dropTxsParameters = {
                        txIndex,
                        txId: abandonedTx,
                        bundledIn: tx.bundled_in,
                        dataItemIndex: tx.data_item_index,
                        dataRoot: tx.data_root,
                        owner: tx.owner,
                        target: tx.target,
                    };
                    try {
                        yield mapper_1.cassandraClient.exec((0, txs_mapper_1.dropTxsQuery)(dropTxsParameters));
                    }
                    catch (_k) { }
                }
            }
        }
        const nthMillBlock = abandonedBlock.height.div(1e6).toInt();
        try {
            const maybeMatchingBlock = yield (0, mapper_1.blockSortedAscMapper)({
                nth_million: nthMillBlock,
                block_height: abandonedBlock.block_height,
            });
            if (maybeMatchingBlock && maybeMatchingBlock.block_hash === blockHash) {
                yield mapper_1.blockSortedAscMapper.remove({
                    nth_million: nthMillBlock,
                    block_height: abandonedBlock.block_height,
                });
            }
        }
        catch (_l) { }
        try {
            const maybeMatchingBlock = yield (0, mapper_1.blockSortedDescMapper)({
                nth_million: nthMillBlock,
                block_height: abandonedBlock.block_height,
            });
            if (maybeMatchingBlock && maybeMatchingBlock.block_hash === blockHash) {
                yield mapper_1.blockSortedDescMapper.remove({
                    nth_million: nthMillBlock,
                    block_height: abandonedBlock.block_height,
                });
            }
        }
        catch (_m) { }
        try {
            yield mapper_1.blockMapper.remove({
                indep_hash: blockHash,
            });
        }
        catch (_o) {
            return TruncateBlockReturnCode.REQUEUE;
        }
        return TruncateBlockReturnCode.OK;
    });
}
exports.truncateBlock = truncateBlock;
// await blockMapper.remove({ indep_hash: block.block_hash });
// await blockHeightToHashMapper.remove({
//   block_height: block.block_height,
// });
//# sourceMappingURL=truncate-block.js.map