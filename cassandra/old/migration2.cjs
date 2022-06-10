const fs = require("fs");
const path = require("path");
const R = require("rambda");
const { mapping, types } = require("cassandra-driver");
const { Mapper } = mapping;
const KEYSPACE = process.env["KEYSPACE"] ? process.env["KEYSPACE"] : "gateway";

// short lived migration 0 didn't work
// due to cassandra's inability to
// filter pairs of columns with IN operator
// on primary keys (works only with clustering keys)
const migration0Tables = [
  "tx_tag_gql_asc_migration_0",
  "tx_tag_gql_desc_migration_0",
  "tx_tag_gql_by_tx_id_asc_migration_0",
  "tx_tag_gql_by_tx_id_desc_migration_0",
  "tx_tag_gql_by_owner_asc_migration_0",
  "tx_tag_gql_by_owner_desc_migration_0",
  "tx_tag_gql_by_target_asc_migration_0",
  "tx_tag_gql_by_target_desc_migration_0",
  "tx_tag_gql_by_bundled_in_asc_migration_0",
  "tx_tag_gql_by_bundled_in_desc_migration_0",
  "tx_tag_gql_by_data_root_asc_migration_0",
  "tx_tag_gql_by_data_root_desc_migration_0",
  "tx_tag_gql_by_tx_id_and_owner_asc_migration_0",
  "tx_tag_gql_by_tx_id_and_owner_desc_migration_0",
  "tx_tag_gql_by_tx_id_and_target_asc_migration_0",
  "tx_tag_gql_by_tx_id_and_target_desc_migration_0",
  "tx_tag_gql_by_tx_id_and_bundled_in_asc_migration_0",
  "tx_tag_gql_by_tx_id_and_bundled_in_desc_migration_0",
  "tx_tag_gql_by_tx_id_and_data_root_asc_migration_0",
  "tx_tag_gql_by_tx_id_and_data_root_desc_migration_0",
  "tx_tag_gql_by_owner_and_target_asc_migration_0",
  "tx_tag_gql_by_owner_and_target_desc_migration_0",
  "tx_tag_gql_by_owner_and_bundled_in_asc_migration_0",
  "tx_tag_gql_by_owner_and_bundled_in_desc_migration_0",
  "tx_tag_gql_by_owner_and_data_root_asc_migration_0",
  "tx_tag_gql_by_owner_and_data_root_desc_migration_0",
  "tx_tag_gql_by_target_and_bundled_in_asc_migration_0",
  "tx_tag_gql_by_target_and_bundled_in_desc_migration_0",
  "tx_tag_gql_by_target_and_data_root_asc_migration_0",
  "tx_tag_gql_by_target_and_data_root_desc_migration_0",
  "tx_tag_gql_by_bundled_in_and_data_root_asc_migration_0",
  "tx_tag_gql_by_bundled_in_and_data_root_desc_migration_0",
  "tx_tag_gql_by_tx_id_and_owner_and_target_asc_migration_0",
  "tx_tag_gql_by_tx_id_and_owner_and_target_desc_migration_0",
  "tx_tag_gql_by_tx_id_and_owner_and_bundled_in_asc_migration_0",
  "tx_tag_gql_by_tx_id_and_owner_and_bundled_in_desc_migration_0",
  "tx_tag_gql_by_tx_id_and_owner_and_data_root_asc_migration_0",
  "tx_tag_gql_by_tx_id_and_owner_and_data_root_desc_migration_0",
  "tx_tag_gql_by_tx_id_and_target_and_bundled_in_asc_migration_0",
  "tx_tag_gql_by_tx_id_and_target_and_bundled_in_desc_migration_0",
  "tx_tag_gql_by_tx_id_and_target_and_data_root_asc_migration_0",
  "tx_tag_gql_by_tx_id_and_target_and_data_root_desc_migration_0",
  "tx_tag_gql_by_tx_id_and_bundled_in_and_data_root_asc_migration_0",
  "tx_tag_gql_by_tx_id_and_bundled_in_and_data_root_desc_migration_0",
  "tx_tag_gql_by_owner_and_target_and_bundled_in_asc_migration_0",
  "tx_tag_gql_by_owner_and_target_and_bundled_in_desc_migration_0",
  "tx_tag_gql_by_owner_and_target_and_data_root_asc_migration_0",
  "tx_tag_gql_by_owner_and_target_and_data_root_desc_migration_0",
  "tx_tag_gql_by_owner_and_bundled_in_and_data_root_asc_migration_0",
  "tx_tag_gql_by_owner_and_bundled_in_and_data_root_desc_migration_0",
  "tx_tag_gql_by_target_and_bundled_in_and_data_root_asc_migration_0",
  "tx_tag_gql_by_target_and_bundled_in_and_data_root_desc_migration_0",
  "tx_tag_gql_by_tx_id_and_owner_and_target_and_bundled_in_asc_migration_0",
  "tx_tag_gql_by_tx_id_and_owner_and_target_and_bundled_in_desc_migration_0",
  "tx_tag_gql_by_tx_id_and_owner_and_target_and_data_root_asc_migration_0",
  "tx_tag_gql_by_tx_id_and_owner_and_target_and_data_root_desc_migration_0",
  "tx_tag_gql_by_tx_id_and_owner_and_bundled_in_and_data_root_asc_migration_0",
  "tx_tag_gql_by_tx_id_and_owner_and_bundled_in_and_data_root_desc_migration_0",
  "tx_tag_gql_by_tx_id_and_target_and_bundled_in_and_data_root_asc_migration_0",
  "tx_tag_gql_by_tx_id_and_target_and_bundled_in_and_data_root_desc_migration_0",
  "tx_tag_gql_by_owner_and_target_and_bundled_in_and_data_root_asc_migration_0",
  "tx_tag_gql_by_owner_and_target_and_bundled_in_and_data_root_desc_migration_0",
  "tx_tag_gql_by_tx_id_and_owner_and_target_and_bundled_in_and_data_root_asc_migration_0",
  "tx_tag_gql_by_tx_id_and_owner_and_target_and_bundled_in_and_data_root_desc_migration_0",
];

const tagModels = {
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

const makeTagsMapper = (cassandraClient) =>
  new Mapper(cassandraClient, {
    models: {
      Tag: {
        keyspace: KEYSPACE,
        tables: ["tx_tag_gql_asc_migration_1", "tx_tag_gql_desc_migration_1"],
      },
      TagAndTxId: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_tx_id_asc_migration_1",
          "tx_tag_gql_by_tx_id_desc_migration_1",
        ],
      },
      TagAndOwner: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_owner_asc_migration_1",
          "tx_tag_gql_by_owner_desc_migration_1",
        ],
      },
      TagAndTarget: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_target_asc_migration_1",
          "tx_tag_gql_by_target_desc_migration_1",
        ],
      },
      TagAndBundledIn: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_bundled_in_asc_migration_1",
          "tx_tag_gql_by_bundled_in_desc_migration_1",
        ],
      },
      TagAndDataRoot: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_data_root_asc_migration_1",
          "tx_tag_gql_by_data_root_desc_migration_1",
        ],
      },
      TagAndTxIdAndOwner: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_tx_id_and_owner_asc_migration_1",
          "tx_tag_gql_by_tx_id_and_owner_desc_migration_1",
        ],
      },
      TagAndTxIdAndTarget: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_tx_id_and_target_asc_migration_1",
          "tx_tag_gql_by_tx_id_and_target_desc_migration_1",
        ],
      },
      TagAndTxIdAndBundledIn: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_tx_id_and_bundled_in_asc_migration_1",
          "tx_tag_gql_by_tx_id_and_bundled_in_desc_migration_1",
        ],
      },
      TagAndTxIdAndDataRoot: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_tx_id_and_data_root_asc_migration_1",
          "tx_tag_gql_by_tx_id_and_data_root_desc_migration_1",
        ],
      },
      TagAndOwnerAndTarget: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_owner_and_target_asc_migration_1",
          "tx_tag_gql_by_owner_and_target_desc_migration_1",
        ],
      },
      TagAndOwnerAndBundledIn: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_owner_and_bundled_in_asc_migration_1",
          "tx_tag_gql_by_owner_and_bundled_in_desc_migration_1",
        ],
      },
      TagAndOwnerAndDataRoot: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_owner_and_data_root_asc_migration_1",
          "tx_tag_gql_by_owner_and_data_root_desc_migration_1",
        ],
      },
      TagAndTargetAndBundledIn: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_target_and_bundled_in_asc_migration_1",
          "tx_tag_gql_by_target_and_bundled_in_desc_migration_1",
        ],
      },
      TagAndTargetAndDataRoot: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_target_and_data_root_asc_migration_1",
          "tx_tag_gql_by_target_and_data_root_desc_migration_1",
        ],
      },
      TagAndBundledInAndDataRoot: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_bundled_in_and_data_root_asc_migration_1",
          "tx_tag_gql_by_bundled_in_and_data_root_desc_migration_1",
        ],
      },
      TagAndTxIdAndOwnerAndTarget: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_tx_id_and_owner_and_target_asc_migration_1",
          "tx_tag_gql_by_tx_id_and_owner_and_target_desc_migration_1",
        ],
      },
      TagAndTxIdAndOwnerAndBundledIn: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_tx_id_and_owner_and_bundled_in_asc_migration_1",
          "tx_tag_gql_by_tx_id_and_owner_and_bundled_in_desc_migration_1",
        ],
      },
      TagAndTxIdAndOwnerAndDataRoot: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_tx_id_and_owner_and_data_root_asc_migration_1",
          "tx_tag_gql_by_tx_id_and_owner_and_data_root_desc_migration_1",
        ],
      },
      TagAndTxIdAndTargetAndBundledIn: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_tx_id_and_target_and_bundled_in_asc_migration_1",
          "tx_tag_gql_by_tx_id_and_target_and_bundled_in_desc_migration_1",
        ],
      },
      TagAndTxIdAndTargetAndDataRoot: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_tx_id_and_target_and_data_root_asc_migration_1",
          "tx_tag_gql_by_tx_id_and_target_and_data_root_desc_migration_1",
        ],
      },
      TagAndTxIdAndBundledInAndDataRoot: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_tx_id_and_bundled_in_and_data_root_asc_migration_1",
          "tx_tag_gql_by_tx_id_and_bundled_in_and_data_root_desc_migration_1",
        ],
      },
      TagAndOwnerAndTargetAndBundledIn: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_owner_and_target_and_bundled_in_asc_migration_1",
          "tx_tag_gql_by_owner_and_target_and_bundled_in_desc_migration_1",
        ],
      },
      TagAndOwnerAndTargetAndDataRoot: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_owner_and_target_and_data_root_asc_migration_1",
          "tx_tag_gql_by_owner_and_target_and_data_root_desc_migration_1",
        ],
      },
      TagAndOwnerAndBundledInAndDataRoot: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_owner_and_bundled_in_and_data_root_asc_migration_1",
          "tx_tag_gql_by_owner_and_bundled_in_and_data_root_desc_migration_1",
        ],
      },
      TagAndTargetAndBundledInAndDataRoot: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_target_and_bundled_in_and_data_root_asc_migration_1",
          "tx_tag_gql_by_target_and_bundled_in_and_data_root_desc_migration_1",
        ],
      },
      TagAndTxIdAndOwnerAndTargetAndBundledIn: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_tx_id_and_owner_and_target_and_bundled_in_asc_migration_1",
          "tx_tag_gql_by_tx_id_and_owner_and_target_and_bundled_in_desc_migration_1",
        ],
      },
      TagAndTxIdAndOwnerAndTargetAndDataRoot: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_tx_id_and_owner_and_target_and_data_root_asc_migration_1",
          "tx_tag_gql_by_tx_id_and_owner_and_target_and_data_root_desc_migration_1",
        ],
      },
      TagAndTxIdAndOwnerAndBundledInAndDataRoot: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_tx_id_and_owner_and_bundled_in_and_data_root_asc_migration_1",
          "tx_tag_gql_by_tx_id_and_owner_and_bundled_in_and_data_root_desc_migration_1",
        ],
      },
      TagAndTxIdAndTargetAndBundledInAndDataRoot: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_tx_id_and_target_and_bundled_in_and_data_root_asc_migration_1",
          "tx_tag_gql_by_tx_id_and_target_and_bundled_in_and_data_root_desc_migration_1",
        ],
      },
      TagAndOwnerAndTargetAndBundledInAndDataRoot: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_owner_and_target_and_bundled_in_and_data_root_asc_migration_1",
          "tx_tag_gql_by_owner_and_target_and_bundled_in_and_data_root_desc_migration_1",
        ],
      },
      TagAndTxIdAndOwnerAndTargetAndBundledInAndDataRoot: {
        keyspace: KEYSPACE,
        tables: [
          "tx_tag_gql_by_tx_id_and_owner_and_target_and_bundled_in_and_data_root_asc_migration_1",
          "tx_tag_gql_by_tx_id_and_owner_and_target_and_bundled_in_and_data_root_desc_migration_1",
        ],
      },
    },
  });

const getMaxHeightBlock = async (cassandraClient) => {
  let bucketNumber = 0;
  let lastMaxHeight = ["", 0];
  let lastResponse = await cassandraClient.execute(
    `SELECT height,indep_hash FROM ${KEYSPACE}.block_gql_desc_migration_1 WHERE bucket_number = 0 limit 1 ALLOW FILTERING`
  );
  while (lastResponse && !R.isEmpty(lastResponse.rows)) {
    bucketNumber += 1;
    const row = lastResponse.rows[0];
    if (row) {
      lastMaxHeight = [row["indep_hash"], row["height"]];
    }
    lastResponse = await cassandraClient.execute(
      `SELECT height,indep_hash FROM ${KEYSPACE}.block_gql_desc_migration_1 WHERE bucket_number = ${bucketNumber} limit 1 ALLOW FILTERING`
    );
  }
  return lastMaxHeight;
};

const commonFields = ["tx_index", "data_item_index", "tx_id"];

const insertGqlTag = async (tagsMapper, tx) => {
  if (tx.tags && !R.isEmpty(tx.tags)) {
    for (const tagModelName of Object.keys(tagModels)) {
      const tagMapper = tagsMapper.forModel(tagModelName);
      const allFields = R.concat(commonFields, tagModels[tagModelName]);
      const obj = R.pickAll(allFields, tx);

      // until ans104 comes
      if (!obj["data_item_index"]) {
        obj["data_item_index"] = types.Long.fromNumber(0);
      }
      let index = 0;
      for (const tuple of tx.tags) {
        const [tag_name, tag_value] = tuple.values();
        const insertObject = R.merge(obj, {
          tag_pair: `${tag_name}-${tag_value}`,
          tag_index: index,
        });
        // console.error(tagModelName, insertObject);
        await tagMapper.insert(insertObject);
        index += 1;
      }
    }
  }
};

// in case of undetected gap
async function importBlock(height) {
  const childProcess = spawn(
    "node",
    [
      "--experimental-specifier-resolution=node",
      "--loader=ts-node/esm.mjs",
      "./cli/_import-block",
      height,
    ],
    {
      shell: true,
      stdio: "inherit",
      env: { ...process.env, TS_NODE_FILES: "true" },
    }
  );
  return new Promise((done, error) => {
    childProcess.on("exit", (exitCode) => {
      if (exitCode === 0) {
        console.log(`block ${height} was successfully imported`);
        done();
      } else {
        console.log(`block ${height} couldn't be imported`);
        error();
      }
    });
  });
}

let concurrent = 0;

module.exports = async (client) => {
  const pWaitFor = (await import("p-wait-for")).default;
  const allTables = await client.execute("describe tables");
  const needsMigration =
    allTables.rows.filter((row) =>
      [
        "tx_tag_gql_by_name_asc_migration_1",
        "tx_tag_gql_asc_migration_0",
      ].includes(row.name)
    ).length > 0;

  const tagsMapper = makeTagsMapper(client);
  let migrationState;
  const migrationStateFile = path.resolve(__dirname, "./migration2.json");

  if (needsMigration) {
    if (fs.existsSync(migrationStateFile)) {
      migrationState = JSON.parse(fs.readFileSync(migrationStateFile));
    } else {
      const lastMaxHeight = await getMaxHeightBlock(client);
      migrationState = { goal: lastMaxHeight[1].add(1).toInt(), current: 0 };
      fs.writeFileSync(migrationStateFile, JSON.stringify(migrationState));
    }

    while (migrationState.current < migrationState.goal) {
      console.log(migrationState);
      let blockHashQ = await client.execute(
        `SELECT block_hash FROM ${KEYSPACE}.block_height_to_hash WHERE block_height = ${migrationState.current}`
      );
      if (blockHashQ.rows.length === 0) {
        await importBlock(migrationState.current);
        // allow it to settle
        await new Promise((resolve) => setTimeout(resolve, 30000));
        blockHashQ = await client.execute(
          `SELECT block_hash FROM ${KEYSPACE}.block_height_to_hash WHERE block_height = ${migrationState.current}`
        );
      }
      const blockHash = blockHashQ.rows[0].block_hash;
      const blockQ = await client.execute(
        `SELECT height,txs,txs_count FROM ${KEYSPACE}.block WHERE indep_hash = '${blockHash}'`
      );
      const txs = blockQ.rows[0].txs;
      if (Array.isArray(txs)) {
        for (const txId of txs) {
          const txQ = await client.execute(
            `SELECT * FROM ${KEYSPACE}.transaction WHERE tx_id = '${txId}'`
          );
          const tx = txQ.rows[0];
          if (tx && tx.tag_count && tx.tag_count > 0) {
            if (typeof tx.target !== "string") {
              tx.target = "";
            }
            if (typeof tx.bundled_in !== "string") {
              tx.bundled_in = "";
            }
            // possible artifacts of the 2.0 migration
            // nodes always ignore data_root on v1 txs
            // because for them it must be equal to the one they construct from data
            if (typeof tx.data_root !== "string") {
              tx.data_root = "";
            }
            await pWaitFor(() => concurrent < 100);
            concurrent += 1;
            insertGqlTag(tagsMapper, tx).then(() => {
              concurrent -= 1;
            });
          }
        }
      }
      migrationState.current += 1;
      fs.writeFileSync(migrationStateFile, JSON.stringify(migrationState));
    }
    console.log("migration2: DONE");
    await client.execute(
      `DROP TABLE IF EXISTS ${KEYSPACE}.tx_tag_gql_by_name_asc_migration_1`,
      [],
      {
        prepare: true,
      }
    );
    await client.execute(
      `DROP TABLE IF EXISTS ${KEYSPACE}.tx_tag_gql_by_name_desc_migration_1`,
      [],
      {
        prepare: true,
      }
    );
    for (const migration0Table of migration0Tables) {
      await client.execute(
        `DROP TABLE IF EXISTS ${KEYSPACE}.${migration0Table}`,
        [],
        {
          prepare: true,
        }
      );
    }
  }
};
