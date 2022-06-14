import { importBundleQueue } from "../src/queue";

importBundleQueue.add("Import Bundle", {
    txId: process.argv[2],
    blockHeight: +process.argv[3],
    type: "ANS104"
})