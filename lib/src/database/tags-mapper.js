"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dropTagQuery = exports.makeTagsMapper = exports.tagModels = void 0;
const cassandra_driver_1 = require("cassandra-driver");
const constants_1 = require("../constants");
const { Mapper } = cassandra_driver_1.mapping;
exports.tagModels = {
    Tag: [],
    TagAndTxId: ["tx_id"],
    TagAndOwner: ["owner"],
    TagAndTarget: ["target"],
    TagAndBundledIn: ["bundled_in"],
    TagAndDataRoot: ["data_root"],
    TagAndTxIdAndOwner: ["tx_id", "owner"],
    TagAndTxIdAndTarget: ["tx_id", "target"],
    TagAndTxIdAndBundledIn: ["tx_id", "bundled_in"],
    TagAndTxIdAndDataRoot: ["tx_id", "data_root"],
    TagAndOwnerAndTarget: ["owner", "target"],
    TagAndOwnerAndBundledIn: ["owner", "bundled_in"],
    TagAndOwnerAndDataRoot: ["owner", "data_root"],
    TagAndTargetAndBundledIn: ["target", "bundled_in"],
    TagAndTargetAndDataRoot: ["target", "data_root"],
    TagAndBundledInAndDataRoot: ["bundled_in", "data_root"],
    TagAndTxIdAndOwnerAndTarget: ["tx_id", "owner", "target"],
    TagAndTxIdAndOwnerAndBundledIn: ["tx_id", "owner", "bundled_in"],
    TagAndTxIdAndOwnerAndDataRoot: ["tx_id", "owner", "data_root"],
    TagAndTxIdAndTargetAndBundledIn: ["tx_id", "target", "bundled_in"],
    TagAndTxIdAndTargetAndDataRoot: ["tx_id", "target", "data_root"],
    TagAndTxIdAndBundledInAndDataRoot: ["tx_id", "bundled_in", "data_root"],
    TagAndOwnerAndTargetAndBundledIn: ["owner", "target", "bundled_in"],
    TagAndOwnerAndTargetAndDataRoot: ["owner", "target", "data_root"],
    TagAndOwnerAndBundledInAndDataRoot: ["owner", "bundled_in", "data_root"],
    TagAndTargetAndBundledInAndDataRoot: ["target", "bundled_in", "data_root"],
    TagAndTxIdAndOwnerAndTargetAndBundledIn: [
        "tx_id",
        "owner",
        "target",
        "bundled_in",
    ],
    TagAndTxIdAndOwnerAndTargetAndDataRoot: [
        "tx_id",
        "owner",
        "target",
        "data_root",
    ],
    TagAndTxIdAndOwnerAndBundledInAndDataRoot: [
        "tx_id",
        "owner",
        "bundled_in",
        "data_root",
    ],
    TagAndTxIdAndTargetAndBundledInAndDataRoot: [
        "tx_id",
        "target",
        "bundled_in",
        "data_root",
    ],
    TagAndOwnerAndTargetAndBundledInAndDataRoot: [
        "owner",
        "target",
        "bundled_in",
        "data_root",
    ],
    TagAndTxIdAndOwnerAndTargetAndBundledInAndDataRoot: [
        "tx_id",
        "owner",
        "target",
        "bundled_in",
        "data_root",
    ],
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeTagsMapper = (cassandraClient) => new Mapper(cassandraClient, {
    models: {
        Tag: {
            keyspace: constants_1.KEYSPACE,
            tables: ["tx_tag_gql_asc", "tx_tag_gql_desc"],
        },
        TagAndTxId: {
            keyspace: constants_1.KEYSPACE,
            tables: ["tx_tag_gql_by_tx_id_asc", "tx_tag_gql_by_tx_id_desc"],
        },
        TagAndOwner: {
            keyspace: constants_1.KEYSPACE,
            tables: ["tx_tag_gql_by_owner_asc", "tx_tag_gql_by_owner_desc"],
        },
        TagAndTarget: {
            keyspace: constants_1.KEYSPACE,
            tables: ["tx_tag_gql_by_target_asc", "tx_tag_gql_by_target_desc"],
        },
        TagAndBundledIn: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_bundled_in_asc",
                "tx_tag_gql_by_bundled_in_desc",
            ],
        },
        TagAndDataRoot: {
            keyspace: constants_1.KEYSPACE,
            tables: ["tx_tag_gql_by_data_root_asc", "tx_tag_gql_by_data_root_desc"],
        },
        TagAndTxIdAndOwner: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_tx_id_and_owner_asc",
                "tx_tag_gql_by_tx_id_and_owner_desc",
            ],
        },
        TagAndTxIdAndTarget: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_tx_id_and_target_asc",
                "tx_tag_gql_by_tx_id_and_target_desc",
            ],
        },
        TagAndTxIdAndBundledIn: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_tx_id_and_bundled_in_asc",
                "tx_tag_gql_by_tx_id_and_bundled_in_desc",
            ],
        },
        TagAndTxIdAndDataRoot: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_tx_id_and_data_root_asc",
                "tx_tag_gql_by_tx_id_and_data_root_desc",
            ],
        },
        TagAndOwnerAndTarget: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_owner_and_target_asc",
                "tx_tag_gql_by_owner_and_target_desc",
            ],
        },
        TagAndOwnerAndBundledIn: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_owner_and_bundled_in_asc",
                "tx_tag_gql_by_owner_and_bundled_in_desc",
            ],
        },
        TagAndOwnerAndDataRoot: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_owner_and_data_root_asc",
                "tx_tag_gql_by_owner_and_data_root_desc",
            ],
        },
        TagAndTargetAndBundledIn: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_target_and_bundled_in_asc",
                "tx_tag_gql_by_target_and_bundled_in_desc",
            ],
        },
        TagAndTargetAndDataRoot: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_target_and_data_root_asc",
                "tx_tag_gql_by_target_and_data_root_desc",
            ],
        },
        TagAndBundledInAndDataRoot: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_bundled_in_and_data_root_asc",
                "tx_tag_gql_by_bundled_in_and_data_root_desc",
            ],
        },
        TagAndTxIdAndOwnerAndTarget: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_tx_id_and_owner_and_target_asc",
                "tx_tag_gql_by_tx_id_and_owner_and_target_desc",
            ],
        },
        TagAndTxIdAndOwnerAndBundledIn: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_tx_id_and_owner_and_bundled_in_asc",
                "tx_tag_gql_by_tx_id_and_owner_and_bundled_in_desc",
            ],
        },
        TagAndTxIdAndOwnerAndDataRoot: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_tx_id_and_owner_and_data_root_asc",
                "tx_tag_gql_by_tx_id_and_owner_and_data_root_desc",
            ],
        },
        TagAndTxIdAndTargetAndBundledIn: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_tx_id_and_target_and_bundled_in_asc",
                "tx_tag_gql_by_tx_id_and_target_and_bundled_in_desc",
            ],
        },
        TagAndTxIdAndTargetAndDataRoot: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_tx_id_and_target_and_data_root_asc",
                "tx_tag_gql_by_tx_id_and_target_and_data_root_desc",
            ],
        },
        TagAndTxIdAndBundledInAndDataRoot: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_tx_id_and_bundled_in_and_data_root_asc",
                "tx_tag_gql_by_tx_id_and_bundled_in_and_data_root_desc",
            ],
        },
        TagAndOwnerAndTargetAndBundledIn: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_owner_and_target_and_bundled_in_asc",
                "tx_tag_gql_by_owner_and_target_and_bundled_in_desc",
            ],
        },
        TagAndOwnerAndTargetAndDataRoot: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_owner_and_target_and_data_root_asc",
                "tx_tag_gql_by_owner_and_target_and_data_root_desc",
            ],
        },
        TagAndOwnerAndBundledInAndDataRoot: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_owner_and_bundled_in_and_data_root_asc",
                "tx_tag_gql_by_owner_and_bundled_in_and_data_root_desc",
            ],
        },
        TagAndTargetAndBundledInAndDataRoot: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_target_and_bundled_in_and_data_root_asc",
                "tx_tag_gql_by_target_and_bundled_in_and_data_root_desc",
            ],
        },
        TagAndTxIdAndOwnerAndTargetAndBundledIn: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_tx_id_and_owner_and_target_and_bundled_in_asc",
                "tx_tag_gql_by_tx_id_and_owner_and_target_and_bundled_in_desc",
            ],
        },
        TagAndTxIdAndOwnerAndTargetAndDataRoot: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_tx_id_and_owner_and_target_and_data_root_asc",
                "tx_tag_gql_by_tx_id_and_owner_and_target_and_data_root_desc",
            ],
        },
        TagAndTxIdAndOwnerAndBundledInAndDataRoot: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_tx_id_and_owner_and_bundled_in_and_data_root_asc",
                "tx_tag_gql_by_tx_id_and_owner_and_bundled_in_and_data_root_desc",
            ],
        },
        TagAndTxIdAndTargetAndBundledInAndDataRoot: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_tx_id_and_target_and_bundled_in_and_data_root_asc",
                "tx_tag_gql_by_tx_id_and_target_and_bundled_in_and_data_root_desc",
            ],
        },
        TagAndOwnerAndTargetAndBundledInAndDataRoot: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_owner_and_target_and_bundled_in_and_data_root_asc",
                "tx_tag_gql_by_owner_and_target_and_bundled_in_and_data_root_desc",
            ],
        },
        TagAndTxIdAndOwnerAndTargetAndBundledInAndDataRoot: {
            keyspace: constants_1.KEYSPACE,
            tables: [
                "tx_tag_gql_by_tx_id_and_owner_and_target_and_bundled_in_and_data_root_asc",
                "tx_tag_gql_by_tx_id_and_owner_and_target_and_bundled_in_and_data_root_desc",
            ],
        },
    },
});
exports.makeTagsMapper = makeTagsMapper;
function dropTagQuery({ bundledIn, dataItemIndex, dataRoot, tagIndex, tagName, tagValue, target, txId, txIndex, owner, }) {
    const tagPair = `${tagName}-${tagValue}`;
    const commonWhere = `WHERE tag_pair='${tagPair}' AND tx_index=${txIndex}
                       AND data_item_index=${dataItemIndex} AND tag_index=${tagIndex}`;
    return `
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_asc
    ${commonWhere};
    tx_tag_gql_desc
    ${commonWhere};
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_asc
    ${commonWhere} AND tx_id='${txId}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_desc
    ${commonWhere} AND tx_id='${txId}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_owner_asc
    ${commonWhere} AND owner='${owner}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_owner_desc
    ${commonWhere} AND owner='${owner}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_target_asc
    ${commonWhere} AND target='${target}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_target_desc
    ${commonWhere} AND target='${target}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_bundled_in_asc
    ${commonWhere} AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_bundled_in_desc
    ${commonWhere} AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_data_root_asc
    ${commonWhere} AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_data_root_desc
    ${commonWhere} AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_owner_asc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_owner_desc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_target_asc
    ${commonWhere} AND tx_id='${txId}' AND target='${target}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_target_desc
    ${commonWhere} AND tx_id='${txId}' AND target='${target}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_bundled_in_asc
    ${commonWhere} AND tx_id='${txId}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_bundled_in_desc
    ${commonWhere} AND tx_id='${txId}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_data_root_asc
    ${commonWhere} AND tx_id='${txId}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_data_root_desc
    ${commonWhere} AND tx_id='${txId}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_owner_and_target_asc
    ${commonWhere} AND owner='${owner}' AND target='${target}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_owner_and_target_desc
    ${commonWhere} AND owner='${owner}' AND target='${target}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_owner_and_bundled_in_asc
    ${commonWhere} AND owner='${owner}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_owner_and_bundled_in_desc
    ${commonWhere} AND owner='${owner}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_owner_and_data_root_asc
    ${commonWhere} AND owner='${owner}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_owner_and_data_root_desc
    ${commonWhere} AND owner='${owner}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_target_and_bundled_in_asc
    ${commonWhere} AND target='${target}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_target_and_bundled_in_desc
    ${commonWhere} AND target='${target}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_target_and_data_root_asc
    ${commonWhere} AND target='${target}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_target_and_data_root_desc
    ${commonWhere} AND target='${target}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_bundled_in_and_data_root_asc
    ${commonWhere} AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_bundled_in_and_data_root_desc
    ${commonWhere} AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_owner_and_target_asc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND target='${target}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_owner_and_target_desc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND target='${target}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_owner_and_bundled_in_asc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_owner_and_bundled_in_desc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_owner_and_data_root_asc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_owner_and_data_root_desc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_target_and_bundled_in_asc
    ${commonWhere} AND tx_id='${txId}' AND target='${target}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_target_and_bundled_in_desc
    ${commonWhere} AND tx_id='${txId}' AND target='${target}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_target_and_data_root_asc
    ${commonWhere} AND tx_id='${txId}' AND target='${target}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_target_and_data_root_desc
    ${commonWhere} AND tx_id='${txId}' AND target='${target}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_bundled_in_and_data_root_asc
    ${commonWhere} AND tx_id='${txId}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_bundled_in_and_data_root_desc
    ${commonWhere} AND tx_id='${txId}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_owner_and_target_and_bundled_in_asc
    ${commonWhere} AND owner='${owner}' AND target='${target}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_owner_and_target_and_bundled_in_desc
    ${commonWhere} AND owner='${owner}' AND target='${target}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_owner_and_target_and_data_root_asc
    ${commonWhere} AND owner='${owner}' AND target='${target}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_owner_and_target_and_data_root_desc
    ${commonWhere} AND owner='${owner}' AND target='${target}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_owner_and_bundled_in_and_data_root_asc
    ${commonWhere} AND owner='${owner}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_owner_and_bundled_in_and_data_root_desc
    ${commonWhere} AND owner='${owner}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_target_and_bundled_in_and_data_root_asc
    ${commonWhere} AND target='${target}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_target_and_bundled_in_and_data_root_desc
    ${commonWhere} AND target='${target}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_owner_and_target_and_bundled_in_asc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND target='${target}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_owner_and_target_and_bundled_in_desc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND target='${target}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_owner_and_target_and_data_root_asc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND target='${target}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_owner_and_target_and_data_root_desc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND target='${target}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_owner_and_bundled_in_and_data_root_asc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_owner_and_bundled_in_and_data_root_desc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_target_and_bundled_in_and_data_root_asc
    ${commonWhere} AND tx_id='${txId}' AND target='${target}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_target_and_bundled_in_and_data_root_desc
    ${commonWhere} AND tx_id='${txId}' AND target='${target}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_owner_and_target_and_bundled_in_and_data_root_asc
    ${commonWhere} AND owner='${owner}' AND target='${target}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_owner_and_target_and_bundled_in_and_data_root_desc
    ${commonWhere} AND owner='${owner}' AND target='${target}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_owner_and_target_and_bundled_in_and_data_root_asc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND target='${target}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_tag_gql_by_tx_id_and_owner_and_target_and_bundled_in_and_data_root_desc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND target='${target}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
`;
}
exports.dropTagQuery = dropTagQuery;
//# sourceMappingURL=tags-mapper.js.map