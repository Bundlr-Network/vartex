import * as MQ from "bullmq";
import { ImportBundleJob, importBundleQueue } from "../queue";
import processStream from "arbundles/stream";
import { getTransaction, getTxOffset } from "../query/transaction";
import { Readable } from "node:stream";
import { insertGqlTag, insertTx } from "../database/utils";
import { types as CassandraTypes } from "cassandra-driver";
import * as R from "rambda";
import { UpstreamTag } from "../types/cassandra";
import { getBlock } from "../query/block";
import { toLong } from "../database/cassandra";
import { getDataFromChunksAsStream } from "../query/node";
import { transactionMapper } from "../database/mapper";
import { MQ_REDIS_CONFIG } from "../queue/config";

async function importBundle(bundleTxId: string, blockHeight: number) {
    const block = await getBlock({ height: blockHeight });
    const { offset, size } = await getTxOffset({ txId: bundleTxId, retry: 3 }).then(r => ({ offset: toLong(r.offset), size: toLong(r.size) }));
    const tx = await getTransaction({ txId: bundleTxId, retry: 3 });
    console.log(`Got tx ${tx}`)
    console.log(processStream);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const txs = await processStream.default(getDataFromChunksAsStream({
        startOffset: offset,
        endOffset: offset.add(size)
    }) as unknown as Readable);

    console.log(`Got txs ${txs}`);
    for (const [index, innerTx] of txs.entries()) {
        // const txToInsert: Omit<TransactionType, 'data'> = {
        //     data_root: "",
        //     data_size: innerTx.dataSize,
        //     data_tree: null,
        //     format: -1,
        //     id: innerTx.id,
        //     last_tx: null,
        //     owner: "",
        //     quantity: "",
        //     reward: "",
        //     signature: "",
        //     tags: innerTx.tags,
        //     target: ""
        //
        // };
        // const txIndex = toLong(block.height)
        //     .multiply(1000)
        //     .add(block.txs.indexOf(bundleTxId));

        let tags: CassandraTypes.Tuple[] = [];

        if (!R.isEmpty(innerTx.tags) && Array.isArray(innerTx.tags)) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            tags = tx.tags.map(({ name, value }: UpstreamTag) => CassandraTypes.Tuple.fromArray([name, value]));
        }

        const txx = await transactionMapper.get({ tx_id: innerTx.id });

        const indexOfBundleTx = block.txs.indexOf(bundleTxId);
        if (indexOfBundleTx === -1) throw new Error("Can't find tx in block");

        const tx_index = toLong(tx.height).mul(1000).add(indexOfBundleTx);
        try {
            console.log("Inserting gql")
            await insertGqlTag({
                data_root: null,
                data_size: innerTx.dataSize,
                data_tree: null,
                format: null,
                id: innerTx.id,
                last_tx: null,
                owner: innerTx.owner,
                quantity: null,
                reward: null,
                signature: innerTx.signature,
                tags: innerTx.tags,
                target: innerTx.target,
                tx_id: innerTx.id,
                tx_index
            });
        } catch (error) {
            console.error(JSON.stringify(error));
            throw error;
        }

        await insertTx({
            block_hash: block.indep_hash,
            block_height: toLong(block.height),
            bundled_in: bundleTxId,
            data_root: null,
            data_size: innerTx.dataSize,
            data_tree: null,
            format: null,
            last_tx: null,
            owner: innerTx.owner,
            quantity: null,
            reward: null,
            signature: innerTx.signature,
            tag_count: innerTx.tags.length,
            tags,
            target: innerTx.target,
            tx_id: innerTx.id,
            tx_index,
            data_item_index: toLong(index)
        }, {
            transactionMapper: txx ? [
                "tx_index",
                "data_item_index",
                "block_height",
                "block_hash",
                "bundled_in",
                "data_size",
                "tx_id",
                "owner",
                "signature",
                "tags",
                "tag_count",
                "target",
            ] : undefined
        });
    }
}


(async function () {
    new MQ.QueueScheduler(importBundleQueue.name, MQ_REDIS_CONFIG);

    new MQ.Worker<ImportBundleJob>(importBundleQueue.name, async function(job) {
        console.log(`Starting import bundle job - ${JSON.stringify(job.data)}`);
        if (job.data.type === "ANS102") throw new Error("ANS102 not supported");

        try {
            await importBundle(job.data.txId, job.data.blockHeight);
            // await importBundle(job.data.tx_id, job.data.block_hash, job.data.block_height);
        } catch (error) {
            console.error(`Error occurred while importing tx - ${error}`);
        }
    }, MQ_REDIS_CONFIG);

    // await importBundleScheduler.run();
    // await worker.run();
})();