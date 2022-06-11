import * as MQ from "bullmq";
import { REDIS_CONFIG } from "./config";


//console.log(REDIS_CONFIG);
export type ImportTxJob = { tx_id: string, block_hash: string, block_height: number };
export type ImportBlockJob = { bundleId: number, txId: string } | { bundleId: number };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type S3Job = { txId: string, tx?: any };

export const importTxQueue = new MQ.Queue<ImportTxJob>("Import Tx Queue", { connection: REDIS_CONFIG.redis });

