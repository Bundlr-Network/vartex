import * as R from "rambda";
import {
  types as CassandraTypes,
  Client as CassandraClient,
} from "cassandra-driver";
import { KEYSPACE } from "../constants";
import { Transaction } from "../types/cassandra";
import {
  tagsMapper,
  transactionMapper,
  txMapper,
  txOffsetMapper,
  txsSortedAscMapper,
  txsSortedDescMapper
} from "./mapper";
import { ownerToAddress } from "../utility/encoding";
import { tagModels, txModels } from "./tags-mapper";
import { TransactionType } from "../query/transaction";

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

export const insertGqlTag = async (
    tx: Omit<TransactionType, 'data'> & { tx_index: CassandraTypes.Long, tx_id: string, owner_address?: string }
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

      if (tx.owner_address) environment.owner = tx.owner_address;
      else if (
          typeof environment.owner === "string" &&
          environment.owner.length > 43
      ) {
        environment.owner = ownerToAddress(environment.owner);
      }


      // console.log(`environment ${environment}`)

      let index = 0;
      for (const { name, value } of tx.tags) {
        const [tag_name, tag_value] = [name, value];

        if (allFields.includes("data_root")) environment.data_root ??= "";
        if (allFields.includes("bundled_in")) environment.bundled_in ??= "";

        const insertObject = R.merge(environment, {
          tag_pair: `${tag_name}|${tag_value}`,
          tag_index: index
        });

        console.log(insertObject);
        console.log(tagMapper.name);

        await tagMapper.insert(insertObject);
        index += 1;
      }
    }
  }
};

const commonFields = ["tx_index", "data_item_index", "tx_id"];

export const insertTx = async (
    tx: Transaction & { data_item_index?: CassandraTypes.Long, offset?: CassandraTypes.Long },
    fieldsOpts?: {
      transactionMapper?: string[]
    }
): Promise<void> => {

  console.log(JSON.stringify(tx, null, 4));
  const data_item_index = tx.data_item_index ?? toLong(-1);
  try {
    await transactionMapper.update(tx, {
      fields: fieldsOpts?.transactionMapper ?? [
          "tx_index",
        "data_item_index",
        "block_height",
        "block_hash",
        "bundled_in",
        "data_root",
        "data_size",
        "data_tree",
        "format",
        "tx_id",
        "last_tx",
        "owner",
        "owner_address",
        "quantity",
        "reward",
        "signature",
        "tags",
        "tag_count",
        "target",
      ]
    });
    console.log(`Inserted into transactionMapper - ${tx.tx_id}`);
    const nthMillion = tx.block_height.mul(1e6);
    await txsSortedAscMapper.update(
        { nth_million: nthMillion, tx_id: tx.tx_id, tx_index: tx.tx_index, data_item_index },
        {
          fields: ["nth_million", "tx_id", "tx_index", "data_item_index"]
        }
    );
    console.log(`Inserted into txsSortedAscMapper - ${tx.tx_id}`);
    await txsSortedDescMapper.update(
        { nth_million: nthMillion, tx_id: tx.tx_id, tx_index: tx.tx_index, data_item_index },
        {
          fields: ["nth_million", "tx_id", "tx_index", "data_item_index"]
        }
    );
    console.log(`Inserted into txsSortedDescMapper - ${tx.tx_id}`);
    if (data_item_index.eq(toLong(-1))) {
      await txOffsetMapper.update({ tx_id: tx.tx_id, offset: tx.offset, size: tx.data_size },
          {
            fields: ["tx_id", "offset", "size"]
          }
          );
      console.log(`Inserted into txOffsetMapper - ${tx.tx_id}`);
    }

    console.log(`Importing tx ${tx.tx_id} into several tables`);
    for (const [txModelName, fields] of Object.entries(txModels)) {
      // console.log(fields);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (fields.some(v => !tx[v] || tx[v] === "")) continue;
      const txxMapper = txMapper.forModel(txModelName);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any,unicorn/prefer-spread
      const allFields: any = R.concat(commonFields, fields);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const environment: any = R.pickAll(allFields, tx);

      // console.log(`Mapper - ${txxMapper.name}`);
      // console.log(`allFields ${JSON.stringify(allFields, undefined, 4)}`);

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
      // console.log(tags)
      // console.log("About to insert");
      // console.log(R.merge(environment, {
      //   tag_pairs: tags
      // }), undefined, {
      //   logged: true
      // });

      await txxMapper.update(R.merge(environment, {
        tag_pairs: tags
      }), {
        fields: [ ...fields, "tx_index", "data_item_index", "tag_pairs"]
      }, {
        logged: true
      })
      // console.log("INSERTED!!");
    }
  } catch (error) {
    console.error(error);
  }

}