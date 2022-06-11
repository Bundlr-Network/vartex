"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertTx = exports.getMaxHeightBlock = exports.toLong = void 0;
const tslib_1 = require("tslib");
const R = tslib_1.__importStar(require("rambda"));
const cassandra_driver_1 = require("cassandra-driver");
const constants_1 = require("../constants");
const mapper_1 = require("./mapper");
const toLong = (anyValue) => cassandra_driver_1.types.Long.isLong(anyValue)
    ? anyValue
    : !anyValue && typeof anyValue !== "string"
        ? cassandra_driver_1.types.Long.fromNumber(0)
        : typeof anyValue === "string"
            ? cassandra_driver_1.types.Long.fromString(R.isEmpty(anyValue) ? "0" : anyValue)
            : cassandra_driver_1.types.Long.fromNumber(anyValue);
exports.toLong = toLong;
const getMaxHeightBlock = (cassandraClient) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    let bucketNumber = 0;
    let lastMaxHeight = ["", (0, exports.toLong)(-1)];
    let lastResponse = yield cassandraClient.execute(`SELECT block_height,block_hash FROM ${constants_1.KEYSPACE}.block_height_sorted_desc WHERE nth_million = 0 limit 1`);
    while (lastResponse && !R.isEmpty(lastResponse.rows)) {
        bucketNumber += 1;
        const row = lastResponse.rows[0];
        if (row) {
            lastMaxHeight = [row["block__hash"], row["block_height"]];
        }
        lastResponse = yield cassandraClient.execute(`SELECT block_height,block_hash FROM ${constants_1.KEYSPACE}.block_height_sorted_desc WHERE nth_million = ${bucketNumber} limit 1`);
    }
    return lastMaxHeight;
});
exports.getMaxHeightBlock = getMaxHeightBlock;
const insertTx = (tx) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const data_item_index = (_a = tx.data_item_index) !== null && _a !== void 0 ? _a : (0, exports.toLong)(-1);
    yield mapper_1.transactionMapper.insert(tx);
    const nthMillion = tx.block_height.mul(1e6);
    yield mapper_1.txsSortedAscMapper.insert({ nth_million: nthMillion, tx_id: tx.tx_id, tx_index: tx.tx_index, data_item_index });
    yield mapper_1.txsSortedDescMapper.insert({ nth_million: nthMillion, tx_id: tx.tx_id, tx_index: tx.tx_index, data_item_index });
    if (data_item_index.eq((0, exports.toLong)(-1)))
        yield mapper_1.txOffsetMapper.insert({ tx_id: tx.tx_id, offset: tx.offset, size: tx.data_size });
});
exports.insertTx = insertTx;
//# sourceMappingURL=utils.js.map