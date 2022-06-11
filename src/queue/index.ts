import * as MQ from "bullmq";
import { REDIS_CONFIG } from "./config";


//console.log(REDIS_CONFIG);
export type ImportTxJob = { bundleId: number, txId: string, blockPosted: number, multiplier: number, itemCount: number };
export type ImportBlockJob = { bundleId: number, txId: string } | { bundleId: number };
export type S3Job = { txId: string, tx?: any };

export const importTxQueue = new MQ.Queue<ImportTxJob>("Bundle queues", { connection: REDIS_CONFIG.redis });

