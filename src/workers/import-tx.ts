import * as R from "rambda";
import { types as CassandraTypes } from "cassandra-driver";
import { UpstreamTag } from "../types/cassandra";
import { getTransaction, getTxOffset, TransactionType } from "../query/transaction";
import { ownerToAddress } from "../utility/encoding";
import {
  blockMapper,
  tagsMapper,
  transactionMapper,
} from "../database/mapper";
import { insertTx, toLong } from "../database/utils";
import { tagModels } from "../database/tags-mapper";
import * as MQ from "bullmq";
import { ImportTxJob, importTxQueue } from "../queue";
import Transaction from "arweave/node/lib/transaction";


enum TxReturnCode {
  OK,
  REQUEUE,
  DEQUEUE,
}

const commonFields = ["tx_index", "data_item_index", "tx_id"];

export const insertGqlTag = async (
  tx: Omit<TransactionType, 'data'> & { tx_index: CassandraTypes.Long, tx_id: string }
): Promise<void> => {
  if (!R.isEmpty(tx.tags)) {
    console.log(`Importing tags from ${tx.tx_id} - ${JSON.stringify(tx.tags, undefined, 4)}`);
    for (const tagModelName of Object.keys(tagModels)) {
      const tagMapper = tagsMapper.forModel(tagModelName);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any,unicorn/prefer-spread
      const allFields: any = R.concat(commonFields, tagModels[tagModelName]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const environment: any = R.pickAll(allFields, tx);

      // until ans104 comes
      environment.data_item_index ??= toLong(-1);

      if (
        typeof environment.owner === "string" &&
        environment.owner.length > 43
      ) {
        environment.owner = ownerToAddress(environment.owner);
      }

      environment.bundled_in ??= "";

      // console.log(`environment ${environment}`)

      let index = 0;
      for (const { name, value } of tx.tags) {
        const [tag_name, tag_value] = [name, value];

        const insertObject = R.merge(environment, {
          tag_pair: `${tag_name}|${tag_value}`,
          tag_index: index
        });

        await tagMapper.insert(insertObject);
        index += 1;
      }
    }
  }
};

export const importTx = async (txId: string, blockHash: string): Promise<TxReturnCode> => {
  const block = await blockMapper.get({ indep_hash: blockHash });

  if (!block) {
    console.log(
      `blockHash ${blockHash} has not been imported (or was removed?), therefore not importing ${txId}`
    );
    return TxReturnCode.REQUEUE;
  }

  console.log(`Got block ${block.height}`);

  if (!block.txs.includes(txId)) {
    console.log(
      `Abandoned tx detected? It was not found in txs of block ${blockHash}, therefore dequeue-ing ${txId}`
    );

    return TxReturnCode.DEQUEUE;
  }

  // check if it's already imported, or is attached to abandoned fork
  const maybeImportedTx = await transactionMapper.get({ tx_id: txId });


  if (maybeImportedTx && maybeImportedTx?.block_hash !== "PENDING") {
    if (maybeImportedTx.block_hash === blockHash) {
      console.log(
        `Already imported transaction ${txId}! If you want to force a re-import, please remove the old one first.`
      );
      return TxReturnCode.DEQUEUE;
    } else {
      console.log(
        `Misplaced transaction ${txId}! Perhaps block with hash ${maybeImportedTx.block_hash} was abandoned?\n` +
        `Moving on to import the tx to block ${blockHash} at height ${block.height}`
      );
      return TxReturnCode.DEQUEUE;
    }
  }

  console.log(`Tx ${txId} not imported yet`);


  const tx: TransactionType | undefined = await getTransaction({ txId });

  if (!tx) {
    console.log(`Failed to fetch ${txId} from nodes`);
    return TxReturnCode.REQUEUE;
  }

  console.log(`Got tx from node - ${txId}`);

  const dataSize = toLong(tx.data_size);

  let offset;
  if (dataSize && dataSize.gt(0)) {
    const maybeTxOffset: { size: string, offset: string } | undefined = await getTxOffset({ txId });
    if (!maybeTxOffset) {
      console.log(`Failed to fetch data offset for ${txId} from nodes`);
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
        console.log(JSON.stringify(error));
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
    console.log(`Inserting gql tags for ${txId}...`);
    await insertGqlTag({ ...tx, tx_index: txIndex, tx_id: tx.id });
  } catch (error) {
    console.log(JSON.stringify(error));
    return TxReturnCode.REQUEUE;
  }

  try {
    console.log(`Inserting tx for ${txId}...`);

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
    console.log(JSON.stringify(error));
    return TxReturnCode.REQUEUE;
  }

  return TxReturnCode.DEQUEUE;
};


(async function () {
  const importTxScheduler = new MQ.QueueScheduler(importTxQueue.name);

  const worker = new MQ.Worker<ImportTxJob | Omit<Transaction, 'data'>>(importTxQueue.name, async function (job) {
    console.log()
    console.log()
    switch (job.name) {
      case "Import Tx": {
        console.log(`Running Import Tx job - ${job.data.tx_id}`);
        try {
          await importTx(job.data.tx_id, job.data.block_hash);
        } catch (error) {
          console.error(`Error occurred while importing tx - ${error}`);
        }
        break;
      }
      case "Import Pending Tx": {
        console.log("Importing pending tx");
        const minusOne = toLong(-1);
        const tx = job.data as Transaction;
        await insertGqlTag({
          data_root: tx.data_root,
          data_size: tx.data_size,
          data_tree: tx.data_tree || [],
          format: tx.format,
          id: tx.id,
          last_tx: tx.last_tx,
          owner: tx.owner,
          quantity: tx.quantity,
          reward: tx.reward,
          signature: tx.signature,
          tags: tx.tags,
          target: tx.target,
          tx_id: tx.id,
          tx_index: minusOne
        });
        await insertTx({
          tx_index: minusOne,
          data_item_index: minusOne,
          block_height: minusOne,
          block_hash: "PENDING",
          bundled_in: null /* eslint-disable-line unicorn/no-null */,
          data_root: tx.data_root,
          offset: minusOne,
          data_size: toLong(tx.data_size),
          data_tree: tx.data_tree || [],
          format: tx.format,
          tx_id: tx.id,
          last_tx: tx.last_tx,
          owner: tx.owner,
          quantity: toLong(tx.quantity),
          reward: toLong(tx.reward),
          signature: tx.signature,
          tags: tx.tags.map(t => CassandraTypes.Tuple.fromArray([t.name, t.value])),
          tag_count: tx.tags.length,
          target: tx.target,
        });
        break;
      }
      default: {
        console.error(`Invalid job put in queue - ${job.name}`);
        throw new Error(`Invalid job put in queue - ${job.name}`);
      }
    }
  });
  console.log(importTxScheduler.name);
  console.log(worker.name);

  // await importTxScheduler.run();
  // await worker.run();
})();