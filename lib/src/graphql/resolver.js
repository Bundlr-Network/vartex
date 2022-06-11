"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const tslib_1 = require("tslib");
/* eslint-disable unicorn/no-null */
const R = tslib_1.__importStar(require("rambda"));
const mapper_1 = require("../database/mapper");
const utils_1 = require("../database/utils");
const graphql_fields_1 = tslib_1.__importDefault(require("graphql-fields"));
const dotenv_1 = require("dotenv");
const constants_1 = require("../constants");
// import { findTxIDsFromTagFilters } from "./tag-search";
const tx_search_1 = require("./tx-search");
const encoding_1 = require("../utility/encoding");
process.env.NODE_ENV !== "test" && (0, dotenv_1.config)();
let maxHeightBlock;
(0, utils_1.getMaxHeightBlock)(mapper_1.cassandraClient).then((max) => {
    maxHeightBlock = max;
});
// update once per minute the maxHeight val
setInterval(() => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    try {
        maxHeightBlock = yield (0, utils_1.getMaxHeightBlock)(mapper_1.cassandraClient);
    }
    catch (_a) { }
}), 1000 * 60);
function encodeBlockCursor({ block_hash, block_height, nthMillion, }) {
    const string = JSON.stringify([
        "block_search",
        block_hash,
        block_height,
        nthMillion,
    ]);
    return Buffer.from(string).toString("base64url");
}
function parseBlockCursor(cursor) {
    try {
        const [cursorType, block_hash, block_height, nthMillion] = JSON.parse(Buffer.from(cursor, "base64url").toString());
        return { cursorType, block_hash, block_height, nthMillion };
    }
    catch (_a) {
        throw new Error("invalid cursor");
    }
}
exports.resolvers = {
    Query: {
        transaction: (parent, queryParameters, request, // eslint-disable-line @typescript-eslint/no-unused-vars
        info) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
            const fieldsWithSubFields = (0, graphql_fields_1.default)(info);
            const queryId = queryParameters.id;
            const maybeTx = queryId && !R.isEmpty(queryId)
                ? yield mapper_1.transactionMapper.get({ tx_id: queryId })
                : undefined;
            let maybeBlock = {};
            if (fieldsWithSubFields.block &&
                maybeTx &&
                typeof maybeTx.block_hash === "string") {
                const qResult = yield mapper_1.cassandraClient.execute(`SELECT timestamp,height,previous_block FROM ${constants_1.KEYSPACE}.block WHERE indep_hash='${maybeTx.block_hash}'`);
                maybeBlock = qResult.rows[0] || {};
            }
            return R.assoc("block", maybeBlock, maybeTx);
        }),
        transactions: (parent, queryParameters, request, // eslint-disable-line @typescript-eslint/no-unused-vars
        info) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
            if (!maxHeightBlock) {
                throw new Error(`graphql isn't ready!`);
            }
            const fieldsWithSubFields = (0, graphql_fields_1.default)(info);
            const wantsBlock = R.hasPath("edges.node.block", fieldsWithSubFields);
            // const tagSearchMode =
            //   queryParameters.tags && !R.isEmpty(queryParameters.tags);
            const [txSearchResult, hasNextPage] = yield (0, tx_search_1.findTxIDsFromTxFilters)(maxHeightBlock[1], queryParameters);
            // const [txSearchResult, hasNextPage] = tagSearchMode
            //   ? await findTxIDsFromTagFilters(maxHeightBlock[1], queryParameters)
            //   : await findTxIDsFromTxFilters(maxHeightBlock[1], queryParameters);
            if (R.isEmpty(txSearchResult)) {
                return {
                    pageInfo: {
                        hasNextPage: false,
                    },
                    edges: [],
                };
            }
            const txs = yield Promise.all(txSearchResult.map(({ txId, cursor }) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
                return ({
                    tx: yield mapper_1.transactionMapper.get({ tx_id: txId }),
                    cursor,
                });
            })));
            const txsClean = R.reject(R.isNil)(txs);
            const edges = (yield Promise.all(txsClean.map(({ tx, cursor }) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
                let block = {};
                if (wantsBlock && tx.block_hash) {
                    const qResult = yield mapper_1.cassandraClient.execute(`SELECT indep_hash,timestamp,height,previous_block FROM ${constants_1.KEYSPACE}.block WHERE indep_hash='${tx.block_hash}'`);
                    block = qResult.rows[0] || {};
                }
                return {
                    cursor,
                    node: R.assoc("block", block, tx),
                };
            }))));
            return {
                pageInfo: {
                    hasNextPage,
                },
                edges,
            };
        }),
        block: (parent, queryParameters, request, // eslint-disable-line @typescript-eslint/no-unused-vars
        info // eslint-disable-line @typescript-eslint/no-unused-vars
        ) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
            return yield mapper_1.blockMapper.get({ indep_hash: queryParameters.id });
        }),
        blocks: (parent, queryParameters, request, // eslint-disable-line @typescript-eslint/no-unused-vars
        info
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
            if (!maxHeightBlock) {
                throw new Error(`graphql isn't ready!`);
            }
            const fieldsWithSubFields = (0, graphql_fields_1.default)(info);
            const wantsCursor = R.hasPath("edges.cursor", fieldsWithSubFields);
            // should never "or" to the fallback
            const maxHeight = maxHeightBlock[1] || (0, utils_1.toLong)(10e6);
            const sortOrder = queryParameters.sort === "HEIGHT_ASC" ? "HEIGHT_ASC" : "HEIGHT_DESC";
            const cursorQuery = queryParameters.after &&
                typeof queryParameters.after === "string" &&
                !R.isEmpty(queryParameters.after);
            const maybeCursor = cursorQuery
                ? parseBlockCursor(queryParameters.after)
                : // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    {};
            const tableName = sortOrder === "HEIGHT_ASC"
                ? "block_height_sorted_asc"
                : "block_height_sorted_desc";
            const limit = Math.min(100, queryParameters.first || 10);
            const blockMinHeight_ = typeof queryParameters.height === "object" &&
                typeof queryParameters.height.min === "number"
                ? `${queryParameters.height.min}`
                : "0";
            const blockMinHeight = typeof maybeCursor.block_height !== "undefined" &&
                sortOrder === "HEIGHT_ASC" &&
                (0, utils_1.toLong)(maybeCursor.block_height).gt((0, utils_1.toLong)(blockMinHeight_))
                ? maybeCursor.block_height
                : blockMinHeight_;
            const blockMaxHeight_ = typeof queryParameters.height === "object" &&
                typeof queryParameters.height.max === "number"
                ? `${queryParameters.height.max}`
                : maxHeight.toString();
            const blockMaxHeight = typeof maybeCursor.block_height !== "undefined" &&
                sortOrder === "HEIGHT_DESC" &&
                (0, utils_1.toLong)(maybeCursor.block_height).lt((0, utils_1.toLong)(blockMaxHeight_))
                ? maybeCursor.block_height
                : blockMaxHeight_;
            const xMillions = (0, utils_1.toLong)(blockMaxHeight).div(1e6);
            const rangePostFunction = sortOrder === "HEIGHT_ASC" ? R.identity : R.reverse;
            const bucketStart = typeof maybeCursor.nthMillion !== "undefined" &&
                sortOrder === "HEIGHT_ASC"
                ? maybeCursor.nthMillion
                : 0;
            const bucketEnd = typeof maybeCursor.nthMillion !== "undefined" &&
                sortOrder === "HEIGHT_DESC"
                ? maybeCursor.nthMillion + 1
                : xMillions.add(1).toInt();
            const buckets = rangePostFunction(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            R.range(bucketStart, bucketEnd));
            let hasNextPage = false;
            let resultCount = 0;
            let nthBucket = 0;
            const searchResult = [];
            while (nthBucket < buckets.length && resultCount < limit) {
                const nextResult = yield mapper_1.cassandraClient.execute(`SELECT * FROM ${constants_1.KEYSPACE}.${tableName} WHERE nth_million=${buckets[nthBucket]} AND block_height >= ${blockMinHeight} AND block_height <= ${blockMaxHeight} LIMIT ${limit - resultCount + 1}`);
                for (const row of nextResult.rows) {
                    searchResult.push(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    R.assoc("nthMillion", buckets[nthBucket], row));
                    if (resultCount !== limit) {
                        resultCount += 1;
                    }
                    else {
                        hasNextPage = true;
                    }
                }
                nthBucket += 1;
            }
            const blocks = yield Promise.all(searchResult
                .slice(0, limit)
                .map(({ block_hash }) => tslib_1.__awaiter(void 0, void 0, void 0, function* () { return yield mapper_1.blockMapper.get({ indep_hash: block_hash }); })));
            const cursors = wantsCursor
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    searchResult.slice(1, limit + 1).map((block) => encodeBlockCursor({
                        block_hash: block.block_hash,
                        block_height: block.block_height.toString(),
                        nthMillion: block.nthMillion,
                    }))
                : [];
            return {
                pageInfo: {
                    hasNextPage,
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                edges: blocks.map((block, index) => ({
                    node: block,
                    cursor: wantsCursor && index < cursors.length ? cursors[index] : undefined,
                })),
            };
        }),
    },
    Transaction: {
        id: (parent) => {
            return parent.tx_id;
        },
        dataRoot: (parent) => {
            return parent.data_root;
        },
        anchor: (parent) => {
            return parent.anchor || "";
        },
        signature: (parent) => {
            return parent.signature || "";
        },
        tags: (parent) => {
            return (parent.tags || []).map(encoding_1.utf8DecodeTupleTag);
        },
        recipient: (parent) => {
            return parent.target || "";
        },
        data: (parent) => {
            // Q29udGVudC1UeXBl = "Content-Type"
            // Y29udGVudC10eXBl = "content-type"
            const maybeContentType = Array.isArray(parent.tags) &&
                parent.tags.find((tag) => ["Q29udGVudC1UeXBl", "Y29udGVudC10eXBl"].includes(tag.get(0)));
            return {
                // eslint-ignore-next-line unicorn/explicit-length-check
                size: `${parent.data_size || 0}`,
                type: parent.data_type ||
                    (maybeContentType
                        ? (0, encoding_1.fromB64Url)(maybeContentType.get(1)).toString("utf8")
                        : ""),
            };
        },
        quantity: (parent) => {
            return {
                ar: (0, encoding_1.winstonToAr)((parent.quantity && parent.quantity.toString()) || "0"),
                winston: parent.quantity || "0",
            };
        },
        fee: (parent) => {
            const maybeFee = parent.reward ? parent.reward.toString() : "0";
            return {
                ar: (0, encoding_1.winstonToAr)(maybeFee || "0"),
                winston: maybeFee || "0",
            };
        },
        block: (parent) => {
            return parent.block;
            // if (parent.tx_id) {
            //   return parent.block;
            // } else if (parent.block_id) {
            //   return {
            //     id: parent.block_id,
            //     previous: parent.block_previous,
            //     timestamp: moment(parent.block_timestamp).unix(),
            //     height: parent.block_height,
            //   };
            // }
        },
        owner: (parent) => {
            return {
                address: (0, encoding_1.ownerToAddress)(parent.owner),
                key: parent.owner,
            };
        },
        parent: (parent) => {
            if (parent.parent) {
                return parent.parent;
            }
        },
    },
    Block: {
        /*
        reward: (parent) => {
          return {
            address: parent.extended.reward_addr,
            pool: parent.extended.reward_pool,
          };
        },
        size: (parent) => {
          return parent.extended?.block_size;
        },
        */
        height: (parent) => {
            return parent.height.toInt();
        },
        id: (parent) => {
            return parent.indep_hash;
        },
        previous: (parent) => {
            return parent.previous_block || "";
        },
        timestamp: (parent) => {
            return parent.timestamp.toString();
        },
    },
};
//# sourceMappingURL=resolver.js.map