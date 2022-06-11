import { importTx } from "../src/workers/import-tx";
import { config } from "dotenv";

config();

console.log(process.env.ARWEAVE_NODES);

// txId, blockHeight
const args = process.argv.slice(2);

importTx(args[0], args[1]);
