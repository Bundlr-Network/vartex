import { importBundleQueue } from "../src/queue";

importBundleQueue.add("Import Bundle", {
    tx_id: process.argv[2],
    type: "ANS104"
})