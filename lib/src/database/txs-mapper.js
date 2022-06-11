"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dropTxsQuery = void 0;
const constants_1 = require("../constants");
function dropTxsQuery({ bundledIn, dataItemIndex, dataRoot, target, txId, txIndex, owner, }) {
    const commonWhere = `
    WHERE tx_index=${txIndex}
    AND data_item_index=${dataItemIndex}
  `;
    return `
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_owner_asc
    ${commonWhere} AND owner='${owner}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_owner_desc
    ${commonWhere} AND owner='${owner}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_target_asc
    ${commonWhere} AND target='${target}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_target_desc
    ${commonWhere} AND target='${target}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_bundled_in_asc
    ${commonWhere} AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_bundled_in_desc
    ${commonWhere} AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_data_root_asc
    ${commonWhere} AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_data_root_desc
    ${commonWhere} AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_owner_asc
    ${commonWhere} AND tx_id='${txId}' AND owner='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_owner_desc
    ${commonWhere} AND tx_id='${txId}' AND owner='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_target_asc
    ${commonWhere} AND tx_id='${txId}' AND target='${target}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_target_desc
    ${commonWhere} AND tx_id='${txId}' AND target='${target}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_bundled_in_asc
    ${commonWhere} AND tx_id='${txId}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_bundled_in_desc
    ${commonWhere} AND tx_id='${txId}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_data_root_asc
    ${commonWhere} AND tx_id='${txId}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_data_root_desc
    ${commonWhere} AND tx_id='${txId}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_owner_target_asc
    ${commonWhere} AND owner='${owner}' AND target='${target}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_owner_target_desc
    ${commonWhere} AND owner='${owner}' AND target='${target}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_owner_bundled_in_asc
    ${commonWhere} AND owner='${owner}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_owner_bundled_in_desc
    ${commonWhere} AND owner='${owner}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_owner_data_root_asc
    ${commonWhere} AND owner='${owner}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_owner_data_root_desc
    ${commonWhere} AND owner='${owner}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_target_bundled_in_asc
    ${commonWhere} AND target='${target}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_target_bundled_in_desc
    ${commonWhere} AND target='${target}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_target_data_root_asc
    ${commonWhere} AND target='${target}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_target_data_root_desc
    ${commonWhere} AND target='${target}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_bundled_in_data_root_asc
    ${commonWhere} AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_bundled_in_data_root_desc
    ${commonWhere} AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_owner_target_asc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND target='${target}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_owner_target_desc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND target='${target}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_owner_bundled_in_asc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_owner_bundled_in_desc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_owner_data_root_asc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_owner_data_root_desc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_target_bundled_in_asc
    ${commonWhere} AND tx_id='${txId}' AND target='${target}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_target_bundled_in_desc
    ${commonWhere} AND tx_id='${txId}' AND target='${target}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_target_data_root_asc
    ${commonWhere} AND tx_id='${txId}' AND target='${target}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_target_data_root_desc
    ${commonWhere} AND tx_id='${txId}' AND target='${target}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_bundled_in_data_root_asc
    ${commonWhere} AND tx_id='${txId}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_bundled_in_data_root_desc
    ${commonWhere} AND tx_id='${txId}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_owner_target_bundled_in_asc
    ${commonWhere} AND owner='${owner}' AND target='${target}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_owner_target_bundled_in_desc
    ${commonWhere} AND owner='${owner}' AND target='${target}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_owner_target_data_root_asc
    ${commonWhere} AND owner='${owner}' AND target='${target}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_owner_target_data_root_desc
    ${commonWhere} AND owner='${owner}' AND target='${target}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_owner_bundled_in_data_root_asc
    ${commonWhere} AND owner='${owner}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_owner_bundled_in_data_root_desc
    ${commonWhere} AND owner='${owner}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_target_bundled_in_data_root_asc
    ${commonWhere} AND target='${target}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_target_bundled_in_data_root_desc
    ${commonWhere} AND target='${target}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_owner_target_bundled_in_asc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND target='${target}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_owner_target_bundled_in_desc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND target='${target}' AND bundled_in='${bundledIn}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_owner_target_data_root_asc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND target='${target}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_owner_target_data_root_desc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND target='${target}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_owner_bundled_in_data_root_asc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_owner_bundled_in_data_root_desc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_target_bundled_in_data_root_asc
    ${commonWhere} AND tx_id='${txId}' AND target='${target}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_target_bundled_in_data_root_desc
    ${commonWhere} AND tx_id='${txId}' AND target='${target}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_owner_target_bundled_in_data_root_asc
    ${commonWhere} AND owner='${owner}' AND target='${target}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_owner_target_bundled_in_data_root_desc
    ${commonWhere} AND owner='${owner}' AND target='${target}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_owner_target_bundled_in_data_root_asc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND target='${target}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
    DELETE FROM ${constants_1.KEYSPACE}.tx_gql_by_tx_id_owner_target_bundled_in_data_root_desc
    ${commonWhere} AND tx_id='${txId}' AND owner='${owner}' AND target='${target}' AND bundled_in='${bundledIn}' AND data_root='${dataRoot}';
  `;
}
exports.dropTxsQuery = dropTxsQuery;
//# sourceMappingURL=txs-mapper.js.map