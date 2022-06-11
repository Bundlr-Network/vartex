import * as R from "rambda";
import PQueue from "p-queue";
import { types as CassandraTypes } from "cassandra-driver";
import { MessagesFromParent, MessagesFromWorker } from "./message-types";
import { UpstreamTag } from "../types/cassandra";
import { getTransaction, getTxOffset, TransactionType } from "../query/transaction";
import { ownerToAddress } from "../utility/encoding";
import {
  cassandraClient,
  blockMapper,
  tagsMapper,
  transactionMapper,
  txQueueMapper,
} from "../database/mapper";
import { insertTx, toLong } from "../database/utils";
import { getMessenger } from "../gatsby-worker/child";
import { mkWorkerLog } from "../utility/log";
import { env, KEYSPACE } from "../constants";
import { tagModels } from "../database/tags-mapper";
import * as MQ from "bullmq";
import {ImportTxJob, importTxQueue} from "../queue";
import {loggers} from "winston";

enum TxReturnCode {
  OK,
  REQUEUE,
  DEQUEUE,
}

let messenger = getMessenger<MessagesFromParent, MessagesFromWorker>();

if (messenger) {
  messenger.sendMessage({
    type: "worker:ready",
  });
} else {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (messenger as any) = { sendMessage: console.log };
}

const log = mkWorkerLog(messenger);

const concurrency = env.PARALLEL_TX_IMPORT;

const queue = new PQueue({ concurrency });

const commonFields = ["tx_index", "data_item_index", "tx_id"];

export const insertGqlTag = async (
  tx: TransactionType
): Promise<void> => {
  if (!R.isEmpty(tx.tags)) {
    for (const tagModelName of Object.keys(tagModels)) {
      const tagMapper = tagsMapper.forModel(tagModelName);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any,unicorn/prefer-spread
      const allFields: any = R.concat(commonFields, tagModels[tagModelName]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const environment: any = R.pickAll(allFields, tx);

      // until ans104 comes
      if (!environment["data_item_index"]) {
        environment["data_item_index"] = toLong(-1);
      }
      if (
        typeof environment.owner === "string" &&
        environment.owner.length > 43
      ) {
        environment.owner = ownerToAddress(environment.owner);
      }

      let index = 0;
      for (const { name, value } of tx.tags) {
        const [tag_name, tag_value] = [name, value];

        const insertObject = R.merge(environment, {
          tag_pair: `${tag_name}|${tag_value}`,
          tag_index: index,
        });

        await tagMapper.insert(insertObject);
        index += 1;
      }
    }
  }
};

export const importTx = async (txId: string, blockHash: string): Promise<TxReturnCode> => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const block = await blockMapper({ indep_hash: blockHash });

  if (!block) {
    log(
      `blockHash ${blockHash} has not been imported (or was removed?), therefore not importing ${txId}`
    );
    return TxReturnCode.REQUEUE;
  }

  if (!block.txs.includes(txId)) {
    log(
      `Abandoned tx detected? It was not found in txs of block ${blockHash}, therefore dequeue-ing ${txId}`
    );

    return TxReturnCode.DEQUEUE;
  }

  // check if it's already imported, or is attached to abandoned fork
  const maybeImportedTx = await transactionMapper.get({ txId });

  if (maybeImportedTx) {
    if (maybeImportedTx.block_hash === blockHash) {
      log(
        `Already imported transaction ${txId}! If you want to force a re-import, please remove the old one first.`
      );
      return TxReturnCode.DEQUEUE;
    } else {
      log(
        `Misplaced transaction ${txId}! Perhaps block with hash ${maybeImportedTx.block_hash} was abandoned?\n` +
          `Moving on to import the tx to block ${blockHash} at height ${block.height }`
      );
      return TxReturnCode.DEQUEUE;
    }
  }

  const tx: TransactionType | undefined = await getTransaction({ txId });

  if (!tx) {
    log(`Failed to fetch ${txId} from nodes`);
    return TxReturnCode.REQUEUE;
  }

  const dataSize = toLong(tx.data_size);

  let offset;
  if (dataSize && dataSize.gt(0)) {
    const maybeTxOffset: { size: string, offset: string } | undefined = await getTxOffset({ txId });
    if (!maybeTxOffset) {
      log(`Failed to fetch data offset for ${txId} from nodes`);
      return TxReturnCode.REQUEUE;
    } else {
      try {
        offset = maybeTxOffset.offset;
        // await txOffsetMapper.insert({
        //   tx_id: txId,
        //   size: maybeTxOffset.size,
        //   offset: maybeTxOffset.offset,
        // });
      } catch (error) {
        log(JSON.stringify(error));
        return TxReturnCode.REQUEUE;
      }
    }
  }

  const txIndex = block.height
    .multiply(1000)
    .add(block.txs.indexOf(txId));

  let tags: CassandraTypes.Tuple[] = [];

  if (!R.isEmpty(tx.tags) && Array.isArray(tx.tags)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    tags = tx.tags.map(({ name, value }: UpstreamTag) => CassandraTypes.Tuple.fromArray([name, value]));
  }

  try {
    await insertGqlTag(tx);
  } catch (error) {
    log(JSON.stringify(error));
    return TxReturnCode.REQUEUE;
  }

  try {
    await insertTx({
      tx_index: txIndex,
      data_item_index: toLong(-1),
      block_height: block.height,
      block_hash: block.indep_hash,
      bundled_in: null /* eslint-disable-line unicorn/no-null */,
      data_root: tx.data_root,
      offset: toLong(offset),
      data_size: toLong(tx.data_size),
      data_tree: tx.data_tree || [],
      format: tx.format,
      tx_id: tx.id,
      last_tx: tx.last_tx,
      owner: tx.owner,
      quantity: toLong(tx.quantity),
      reward: toLong(tx.reward),
      signature: tx.signature,
      tags,
      tag_count: tags.length,
      target: tx.target,
    });
  } catch (error) {
    log(JSON.stringify(error));
    return TxReturnCode.REQUEUE;
  }

  return TxReturnCode.DEQUEUE;
};

let workerIsWorking = false;

export async function consumeQueueOnce(): Promise<void> {
  if (!workerIsWorking) {
    workerIsWorking = true;
    const result = await cassandraClient.execute(
      `SELECT * FROM ${KEYSPACE}.tx_queue`,
      [],
      { prepare: true }
    );

    for await (const pendingTx of result) {
      const callback = async () => {
        const txImportResult = await importTx(
          pendingTx.tx_id,
          pendingTx.block_hash
        );
        switch (txImportResult) {
          case TxReturnCode.OK: {
            try {
              await txQueueMapper.remove({ tx_id: pendingTx.tx_id });
            } catch (error) {
              log(
                `tx was imported but encountered error while dequeue-ing ${JSON.stringify(
                  error
                )}`
              );
            } finally {
              log(`${pendingTx.tx_id} successfully imported!`);
            }
            break;
          }
          case TxReturnCode.DEQUEUE: {
            try {
              await txQueueMapper.remove({ tx_id: pendingTx.tx_id });
            } catch {
              /* logs should've been printed already */
            }
            break;
          }
          default: {
            try {
              await txQueueMapper.update({
                tx_id: pendingTx.tx_id,
                last_import_attempt: CassandraTypes.LocalTime.now(),
                import_attempt_cnt: (pendingTx.import_attempt_cnt || 0) + 1,
              });
            } catch (error) {
              log(
                `Error encountered while requeue-ing a tx ${JSON.stringify(
                  error
                )}`
              );
            }
          }
        }
      };

      queue.add(callback);
    }

    await queue.onIdle();
    workerIsWorking = false;
  } else {
    log(`Can't consume queue while worker is still consuming`);
  }
}


(async function () {
  const importTxScheduler = new MQ.QueueScheduler(importTxQueue.name);

  const worker = new MQ.Worker<ImportTxJob>(importTxQueue.name, async function(job) {
    try {
      await importTx(job.data.tx_id, job.data.block_hash);
    } catch (error) {
      console.error(`Error occurred while importing tx - ${error}`);
    }
  });

  await importTxScheduler.run();
  await worker.run();
})();