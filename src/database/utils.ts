import * as R from "rambda";
import {
  types as CassandraTypes,
  Client as CassandraClient,
} from "cassandra-driver";
import { KEYSPACE } from "../constants";
import { Transaction } from "../types/cassandra";
import { transactionMapper, txMapper, txOffsetMapper, txsSortedAscMapper, txsSortedDescMapper } from "./mapper";
import { ownerToAddress } from "../utility/encoding";
import { txModels } from "./tags-mapper";

export const toLong = (
  anyValue: CassandraTypes.Long | number | string | undefined
): CassandraTypes.Long =>
  CassandraTypes.Long.isLong(anyValue)
    ? anyValue
    : !anyValue && typeof anyValue !== "string"
    ? CassandraTypes.Long.fromNumber(0)
    : typeof anyValue === "string"
    ? CassandraTypes.Long.fromString(R.isEmpty(anyValue) ? "0" : anyValue)
    : CassandraTypes.Long.fromNumber(anyValue);

export const getMaxHeightBlock = async (
  cassandraClient: CassandraClient
): Promise<[string, CassandraTypes.Long]> => {
  let bucketNumber = 0;
  let lastMaxHeight: [string, CassandraTypes.Long] = ["", toLong(-1)];
  let lastResponse = await cassandraClient.execute(
    `SELECT block_height,block_hash FROM ${KEYSPACE}.block_height_sorted_desc WHERE nth_million = 0 limit 1`
  );
  while (lastResponse && !R.isEmpty(lastResponse.rows)) {
    bucketNumber += 1;
    const row = lastResponse.rows[0];
    if (row) {
      lastMaxHeight = [row["block__hash"], row["block_height"]];
    }
    lastResponse = await cassandraClient.execute(
      `SELECT block_height,block_hash FROM ${KEYSPACE}.block_height_sorted_desc WHERE nth_million = ${bucketNumber} limit 1`
    );
  }
  return lastMaxHeight;
};

const commonFields = ["tx_index", "data_item_index", "tx_id"];

export const insertTx = async (
    tx: Transaction & { data_item_index?: CassandraTypes.Long, offset?: CassandraTypes.Long }
): Promise<void> => {
  const data_item_index = tx.data_item_index ?? toLong(-1);
  try {
    await transactionMapper.insert(tx);
    console.log(`Inserted into transactionMapper - ${tx.tx_id}`);
    const nthMillion = tx.block_height.mul(1e6);
    await txsSortedAscMapper.insert({ nth_million: nthMillion, tx_id: tx.tx_id, tx_index: tx.tx_index, data_item_index });
    console.log(`Inserted into txsSortedAscMapper - ${tx.tx_id}`);
    await txsSortedDescMapper.insert({ nth_million: nthMillion, tx_id: tx.tx_id, tx_index: tx.tx_index, data_item_index });
    console.log(`Inserted into txsSortedDescMapper - ${tx.tx_id}`);
    if (data_item_index.eq(toLong(-1))) {
      await txOffsetMapper.insert({ tx_id: tx.tx_id, offset: tx.offset, size: tx.data_size });
      console.log(`Inserted into txOffsetMapper - ${tx.tx_id}`);
    }

    console.log(`Importing tx ${tx.tx_id} into several tables`);
    for (const txModelName of Object.keys(txModels)) {
      const txxMapper = txMapper.forModel(txModelName);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any,unicorn/prefer-spread
      const allFields: any = R.concat(commonFields, txModels[txModelName]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const environment: any = R.pickAll(allFields, tx);

      console.log(`Mapper - ${txxMapper.name}`);
      console.log(`allFields ${JSON.stringify(allFields, undefined, 4)}`);

      // until ans104 comes
      environment.data_item_index ??= toLong(-1);

      if (
          typeof environment.owner === "string" &&
          environment.owner.length > 43
      ) {
        environment.owner = ownerToAddress(environment.owner);
      }

      environment.bundled_in ??= "";

      const tags = tx.tags.map(t => t.elements.join("|"));
      console.log(tags)
      console.log("About to insert");
      await txxMapper.insert(R.merge(environment, {
        tag_pairs: tags
      }))
      console.log("INSERTED!!");
    }
  } catch (error) {
    console.error(error);
  }

}