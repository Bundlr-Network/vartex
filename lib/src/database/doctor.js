"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findBlockGaps = exports.checkForBlockGaps = void 0;
const tslib_1 = require("tslib");
const R = tslib_1.__importStar(require("rambda"));
const constants_1 = require("../constants");
const cassandra_1 = require("./cassandra");
// import { BlockType } from "../query/block.query";
// import {
//   getCacheByKey,
//   recollectImportableTxs,
//   recollectIncomingTxs,
// } from "../caching/cacache";
// import * as C from "./constants";
const checkForBlockGaps = (maxHeight) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    // const expectedBlockHeightResult = await cassandraClient.execute(
    //   `SELECT height FROM ${KEYSPACE}.${tableId.TABLE_GQL_BLOCK_DESC} LIMIT 1`
    // );
    // const expectedBlockHeight = expectedBlockHeightResult.rows[0].height;
    const eachBucket = R.range(0, maxHeight.toInt());
    let totalBlocksCount = (0, cassandra_1.toLong)(0);
    for (const bucket of eachBucket) {
        // const currentPartition = toLong(bucket)
        //   .mul(C.GQL_BLOCK_HEIGHT_BUCKET_SIZE)
        //   .divide(C.GQL_BLOCK_HEIGHT_PARTITION_SIZE)
        //   .toString();
        const currentBucketCountResult = yield cassandra_1.cassandraClient.execute(`SELECT COUNT(*) from ${constants_1.KEYSPACE}.block_height_sorted_asc
       WHERE nth_million=${bucket}`);
        totalBlocksCount = totalBlocksCount.add(currentBucketCountResult.rows[0].count);
    }
    return !maxHeight.subtract(1).equals(totalBlocksCount);
});
exports.checkForBlockGaps = checkForBlockGaps;
const findBlockGaps = (maxHeight) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const queryHeightGroups = R.splitEvery(1000000, R.range(0, maxHeight.add(1).toInt()));
    const missingHeights = [];
    for (const [index, heightGroup] of queryHeightGroups.entries()) {
        const blockQ = yield cassandra_1.cassandraClient.execute(`SELECT block_height FROM ${constants_1.KEYSPACE}.block_height_sorted_asc  WHERE nth_million = ${index} AND block_height >= ${R.head(heightGroup)} AND block_height <= ${R.last(heightGroup)}`);
        for (const height of R.range(R.head(heightGroup), R.last(heightGroup) + 1)) {
            const findResult = R.findIndex((row) => row.block_height.equals(height))(blockQ.rows);
            if (findResult < 0) {
                missingHeights.push(height);
            }
        }
        return missingHeights;
    }
});
exports.findBlockGaps = findBlockGaps;
/*
export const findTxGaps = async (maxHeight: CassandraTypes.Long): Promise<void> => {

  const queryHeightGroups = R.splitEvery(
    C.MAX_TX_PER_BLOCK,
    R.range(0, topHeight.add(1).toInt())
  );

  const missingTxs: string[] = [];

  for (const heightGroup of queryHeightGroups) {
    const blockQ = await cassandraClient.execute(
      `SELECT height,txs,txs_count FROM ${KEYSPACE}.${
        tableId.TABLE_BLOCK
      } WHERE height >= ${R.head(heightGroup)} AND height <= ${R.last(
        heightGroup
      )} ALLOW FILTERING`
    );

    const txCounts = blockQ.rows.filter(
      (row) => row.txs_count && row.txs_count !== 0
    );

    for (const { txs_count, height, txs } of txCounts) {
      const txCntQ = await cassandraClient.execute(
        `SELECT COUNT(*) FROM ${KEYSPACE}.${
          tableId.TABLE_TX
        } WHERE block_height>=${height.divide(
          C.MAX_TX_PER_BLOCK
        )} AND block_height<${height
          .add(1)
          .divide(C.MAX_TX_PER_BLOCK)} ALLOW FILTERING`
      );

      if (txCntQ.rowLength !== txs_count) {
        const txDataQ = await cassandraClient.execute(
          `SELECT tx_id FROM ${KEYSPACE}.${
            tableId.TABLE_TX
          } WHERE block_height>=${height.divide(
            C.MAX_TX_PER_BLOCK
          )} AND block_height<${height
            .add(1)
            .divide(C.MAX_TX_PER_BLOCK)} ALLOW FILTERING`
        );
        for (const { tx_id } of txDataQ.rows) {
          if (!txs.includes(tx_id)) {
            missingTxs.push(tx_id);
          }
        }
      }
    }
  }

  if (!R.isEmpty(missingTxs)) {
    console.error(
      "Very bad situation it seems these txs are missing",
      missingTxs
    );
  }
};
*/
// export async function enqueueUnhandledCache(
//   enqueueIncomingTxQueue: (any) => void,
//   enqueueTxQueue: (any) => void,
//   txImportCallback: (
//     integrity: string,
//     txIndex_: CassandraTypes.Long,
//     gauge?: any,
//     getProgress?: () => string
//   ) => (fresolve?: () => void) => Promise<void>,
//   incomingTxCallback: (
//     integrity: string,
//     txIndex_: CassandraTypes.Long,
//     gauge?: any,
//     getProgress?: () => string
//   ) => (fresolve?: () => void) => Promise<void>,
//   txQueue: any
// ) {
//   const unhandledIncomings = await recollectIncomingTxs();
//   const unhandledTxImports = await recollectImportableTxs();
//   if (!R.isEmpty(unhandledIncomings)) {
//     for (const queueItem of unhandledIncomings) {
//       const maybeData = await getCacheByKey(queueItem.key);
//       if (maybeData && maybeData.data) {
//         const data = maybeData.data;
//         const dataParsed = JSON.parse(data.toString());
//         enqueueIncomingTxQueue({
//           height: toLong(0),
//           txIndex: toLong(dataParsed.txIndex),
//           next: incomingTxCallback.bind(txQueue)(
//             queueItem.integrity,
//             toLong(dataParsed.txIndex)
//           ),
//         });
//       }
//     }
//   }
//   if (!R.isEmpty(unhandledTxImports)) {
//     for (const queueItem of unhandledTxImports) {
//       const maybeData = await getCacheByKey(queueItem.key);
//       if (maybeData && maybeData.data) {
//         const data = maybeData.data;
//         const dataParsed = JSON.parse(data.toString());
//         enqueueTxQueue({
//           height: toLong(dataParsed.height),
//           callback: txImportCallback.bind(txQueue)(
//             queueItem.integrity,
//             toLong(dataParsed.index)
//           ),
//           txIndex: toLong(dataParsed.index),
//           type: "tx",
//         });
//       }
//     }
//   }
// }
// const verifyBlock = async (height: number): Promise<boolean> => {
//   const queryResponse = await cassandraClient.execute(
//     `SELECT height FROM ${KEYSPACE}.block LIMIT 1`
//   );
//   if (queryResponse && queryResponse.rowLength > 0) {
//     return false;
//   } else {
//     return true;
//   }
// };
// export const checkfixMissingTxs = async (): Promise<void> => {
//   const queryResponse = await cassandraClient.execute(
//     `SELECT height FROM ${KEYSPACE}.block_gql_desc LIMIT 1`
//   );
//   let tallestBlock = queryResponse.rows[0].height.toInt();
//   const blockGroups = R.range(0, tallestBlock).reduce(
//     ([buffer, groups], height) => {
//       if (height % 1000 === 0 && height !== 0) {
//         return [[height], R.concat(groups, buffer)];
//       } else {
//         return [R.concat(buffer, [height]), groups];
//       }
//     },
//     [[], []]
//   );
// };
// export const fixNonLinearBlockOrder = async (): Promise<void> => {
//   const queryResponse = await cassandraClient.execute(
//     `SELECT height FROM ${KEYSPACE}.block_gql_desc LIMIT 1`
//   );
//   let tallestBlock = queryResponse.rows[0].height.toInt();
//   let expectedBlocks = R.range(0, tallestBlock);
//   return await new Promise(
//     async (resolve: (val?: any) => void, reject: (err: string) => void) => {
//       cassandraClient.eachRow(
//         `SELECT height FROM ${KEYSPACE}.block`,
//         [],
//         {
//           autoPage: true,
//           prepare: false,
//           executionProfile: 'fast',
//         },
//         function (n, row) {
//           expectedBlocks = R.reject(R.equals(row.height.toInt()))(
//             expectedBlocks
//           );
//         },
//         async function (err, res) {
//           // leftover of expectedBlocks would be missing!
//           for (const missingHeight of expectedBlocks) {
//             const missingBlock = await (queryGetBlock as any)({
//               height: missingHeight,
//             });
//             await makeBlockImportQuery(missingHeight)();
//           }
//           resolve();
//         }
//       );
//     }
//   );
// };
//# sourceMappingURL=doctor.js.map