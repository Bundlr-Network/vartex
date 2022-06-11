import * as MQ from "bullmq";
import { ImportBundleJob, importBundleQueue } from "../queue";
// import processStream from "arbundles/stream";
// import { getDataFromChunksStream } from "../query/node";
// import { getTxOffset, TransactionType } from "../query/transaction";
// import { Readable } from "node:stream";
// import { insertTx } from "../database/utils";
// import { types as CassandraTypes } from "cassandra-driver/lib/types";
// import * as R from "rambda";
// import { UpstreamTag } from "../types/cassandra";
// import { insertGqlTag } from "./import-tx";
// import { getBlock } from "../query/block";
// import { toLong } from "../database/cassandra";

// async function importBundle(txId: string, blockHeight: number) {
//     const block = await getBlock({ height: blockHeight });
//     const tx = await getTxOffset({ txId: txId, retry: 3 });
//     const txs = await processStream(getDataFromChunksStream({
//         startOffset: tx.offset,
//         endOffsett: tx.offset + tx.size
//     }) as unknown as Readable);
//
//     for (const [index, innerTx] of txs.entries()) {
//         const _: Omit<TransactionType, 'data'> = {
//             data_root: "",
//             data_size: "",
//             data_tree: undefined,
//             format: 0,
//             id: "",
//             last_tx: "",
//             owner: "",
//             quantity: "",
//             reward: "",
//             signature: "",
//             tags: undefined,
//             target: ""
//
//         };
//         const txIndex = toLong(block.height)
//             .multiply(1000)
//             .add(block.txs.indexOf(txId));
//
//         let tags: CassandraTypes.Tuple[] = [];
//
//         if (!R.isEmpty(innerTx.tags) && Array.isArray(innerTx.tags)) {
//             // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//             // @ts-ignore
//             tags = tx.tags.map(({ name, value }: UpstreamTag) => CassandraTypes.Tuple.fromArray([name, value]));
//         }
//
//         try {
//             await insertGqlTag(innerTx);
//         } catch (error) {
//             log(JSON.stringify(error));
//             return TxReturnCode.REQUEUE;
//         }
//
//         await insertTx({
//             block_hash: "",
//             block_height: undefined,
//             bundled_in: "",
//             data_root: "",
//             data_size: undefined,
//             data_tree: [],
//             format: 0,
//             last_tx: "",
//             owner: "",
//             quantity: undefined,
//             reward: undefined,
//             signature: "",
//             tag_count: 0,
//             tags: [],
//             target: "",
//             tx_id: "",
//             tx_index: undefined,
//             data_item_index: index
//         });
//     }
// }


(async function () {
    const importBundleScheduler = new MQ.QueueScheduler(importBundleQueue.name);

    const worker = new MQ.Worker<ImportBundleJob>(importBundleQueue.name, async function() {
        try {

            // await importBundle(job.data.tx_id, job.data.block_hash, job.data.block_height);
        } catch (error) {
            console.error(`Error occurred while importing tx - ${error}`);
        }
    });

    await importBundleScheduler.run();
    await worker.run();
})();