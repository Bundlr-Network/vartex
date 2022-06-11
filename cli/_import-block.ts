import { importBlock } from "../src/workers/import-block";


console.log("it's alive!")

const args = process.argv.slice(2);

importBlock(parseInt(args[0]));
