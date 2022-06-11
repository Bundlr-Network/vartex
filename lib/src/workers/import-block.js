"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importBlock = void 0;
const tslib_1 = require("tslib");
const block_1 = require("../query/block");
const mapper_1 = require("../database/mapper");
const utils_1 = require("../database/utils");
const child_1 = require("../gatsby-worker/child");
const log_1 = require("../utility/log");
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
var BlockImportReturnCode;
(function (BlockImportReturnCode) {
    BlockImportReturnCode[BlockImportReturnCode["OK"] = 0] = "OK";
    BlockImportReturnCode[BlockImportReturnCode["REQUEUE"] = 1] = "REQUEUE";
    BlockImportReturnCode[BlockImportReturnCode["DEQUEUE"] = 2] = "DEQUEUE";
})(BlockImportReturnCode || (BlockImportReturnCode = {}));
function importBlock(height) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const newBlock = yield (0, block_1.getBlock)({ height });
        if (!newBlock || typeof newBlock !== "object") {
            log(`Couldn't find block at height ${height} from any node, will retry later...`);
            return BlockImportReturnCode.REQUEUE;
        }
        if (Array.isArray(newBlock.txs)) {
            for (const txId of newBlock.txs) {
                yield mapper_1.txQueueMapper.insert({
                    tx_id: txId,
                    block_hash: newBlock.indep_hash,
                    block_height: height,
                    import_attempt_cnt: 0,
                });
            }
        }
        try {
            yield mapper_1.blockHeightToHashMapper.insert({
                block_height: height,
                block_hash: newBlock.indep_hash,
            });
        }
        catch (error) {
            log(`Error inserting to table blockHeightToHash with height: ${height} and hash: ${newBlock.indep_hash}` +
                error
                ? "\n" + JSON.stringify(error)
                : "");
            return BlockImportReturnCode.REQUEUE;
        }
        try {
            yield mapper_1.blockMapper.insert(newBlock);
        }
        catch (error) {
            log(`Error inserting block to database` + error
                ? "\n" + JSON.stringify(error)
                : "");
            return BlockImportReturnCode.REQUEUE;
        }
        let nthMillBlock;
        try {
            nthMillBlock = (0, utils_1.toLong)(newBlock.height).div(1e6).toInt();
        }
        catch (_a) { }
        if (typeof nthMillBlock !== "number") {
            log(`Error while parsing the block height of ${newBlock.indep_hash} from response`);
            return BlockImportReturnCode.REQUEUE;
        }
        try {
            yield mapper_1.blockSortedAscMapper.insert({
                block_height: height,
                block_hash: newBlock.indep_hash,
                nth_million: nthMillBlock,
            });
        }
        catch (_b) {
            return BlockImportReturnCode.REQUEUE;
        }
        try {
            yield mapper_1.blockSortedDescMapper.insert({
                block_height: height,
                block_hash: newBlock.indep_hash,
                nth_million: nthMillBlock,
            });
        }
        catch (_c) {
            return BlockImportReturnCode.REQUEUE;
        }
        return BlockImportReturnCode.OK;
    });
}
exports.importBlock = importBlock;
//# sourceMappingURL=import-block.js.map