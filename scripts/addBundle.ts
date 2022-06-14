import { importBundleQueue } from "../src/queue";

importBundleQueue.add("Import Bundle", {
    txId: process.argv[2],
    blockHeight: 100,
    type: "ANS104"
})