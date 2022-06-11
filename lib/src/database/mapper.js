"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cassandraClient = exports.tagsMapper = exports.txQueueMapper = exports.txOffsetMapper = exports.txsSortedDescMapper = exports.txsSortedAscMapper = exports.transactionMapper = exports.statusMapper = exports.permawebPathMapper = exports.manifestQueueMapper = exports.manifestMapper = exports.blockQueueMapper = exports.blockSortedDescMapper = exports.blockSortedAscMapper = exports.blockMapper = exports.blockHeightToHashMapper = void 0;
const tslib_1 = require("tslib");
const R = tslib_1.__importStar(require("rambda"));
const cassandra_driver_1 = require("cassandra-driver");
const cassandra_1 = require("./cassandra");
const tags_mapper_1 = require("./tags-mapper");
const constants_1 = require("../constants");
const { Mapper } = cassandra_driver_1.mapping;
// prune the null values away
const withDefault = ({ name, fallback, }) => ({
    [name]: {
        name,
        toModel: (v) => v || fallback,
        fromModel: (v) => v || fallback,
    },
});
const mapper = new Mapper(cassandra_1.cassandraClient, {
    models: {
        BlockHeightByBlockHash: {
            keyspace: constants_1.KEYSPACE,
            tables: ["block_height_to_hash"],
        },
        Block: {
            keyspace: constants_1.KEYSPACE,
            tables: ["block"],
            columns: R.mergeAll([
                withDefault({ name: "cumulative_diff", fallback: "" }),
                withDefault({ name: "hash_list_merkle", fallback: "" }),
                withDefault({ name: "previous_block", fallback: "" }),
                withDefault({ name: "tags", fallback: [] }),
                withDefault({ name: "tx_root", fallback: "" }),
                withDefault({ name: "tx_tree", fallback: "" }),
                withDefault({ name: "txs", fallback: [] }),
            ]),
        },
        BlockSortedAsc: {
            keyspace: constants_1.KEYSPACE,
            tables: ["block_height_sorted_asc"],
        },
        BlockSortedDesc: {
            keyspace: constants_1.KEYSPACE,
            tables: ["block_height_sorted_desc"],
        },
        BlockQueue: {
            keyspace: constants_1.KEYSPACE,
            tables: ["block_queue"],
        },
        Manifest: {
            keyspace: constants_1.KEYSPACE,
            tables: ["manifest"],
        },
        ManifestQueue: {
            keyspace: constants_1.KEYSPACE,
            tables: ["manifest_queue"],
        },
        PermawebPath: {
            keyspace: constants_1.KEYSPACE,
            tables: ["permaweb_path"],
        },
        Status: {
            keyspace: constants_1.KEYSPACE,
            tables: ["status"],
            columns: R.mergeAll([
                withDefault({ name: "current_migrations", fallback: {} }),
                withDefault({ name: "current_imports", fallback: [] }),
            ]),
        },
        Transaction: {
            keyspace: constants_1.KEYSPACE,
            tables: ["transaction"],
            columns: R.mergeAll([
                withDefault({ name: "target", fallback: "" }),
                withDefault({ name: "data", fallback: "" }),
                withDefault({ name: "data_root", fallback: "" }),
                withDefault({ name: "data_tree", fallback: "" }),
                withDefault({ name: "format", fallback: 0 }),
                withDefault({ name: "tx_uuid", fallback: "" }),
            ]),
        },
        TxsSortedAsc: {
            keyspace: constants_1.KEYSPACE,
            tables: ["txs_sorted_asc"],
        },
        TxsSortedDesc: {
            keyspace: constants_1.KEYSPACE,
            tables: ["txs_sorted_desc"],
        },
        TxOffset: {
            keyspace: constants_1.KEYSPACE,
            tables: ["tx_offset"],
        },
        TxQueue: {
            keyspace: constants_1.KEYSPACE,
            tables: ["tx_queue"],
        },
    },
});
exports.blockHeightToHashMapper = mapper.forModel("BlockHeightByBlockHash");
exports.blockMapper = mapper.forModel("Block");
exports.blockSortedAscMapper = mapper.forModel("BlockSortedAsc");
exports.blockSortedDescMapper = mapper.forModel("BlockSortedDesc");
exports.blockQueueMapper = mapper.forModel("BlockQueue");
exports.manifestMapper = mapper.forModel("Manifest");
exports.manifestQueueMapper = mapper.forModel("ManifestQueue");
exports.permawebPathMapper = mapper.forModel("PermawebPath");
exports.statusMapper = mapper.forModel("Status");
exports.transactionMapper = mapper.forModel("Transaction");
exports.txsSortedAscMapper = mapper.forModel("TxsSortedAsc");
exports.txsSortedDescMapper = mapper.forModel("TxsSortedDesc");
exports.txOffsetMapper = mapper.forModel("TxOffset");
exports.txQueueMapper = mapper.forModel("TxQueue");
exports.tagsMapper = (0, tags_mapper_1.makeTagsMapper)(cassandra_1.cassandraClient);
var cassandra_2 = require("./cassandra");
Object.defineProperty(exports, "cassandraClient", { enumerable: true, get: function () { return cassandra_2.cassandraClient; } });
//# sourceMappingURL=mapper.js.map