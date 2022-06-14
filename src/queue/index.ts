import * as MQ from "bullmq";
import { MQ_REDIS_CONFIG } from "./config";


//console.log(REDIS_CONFIG);
export type ImportTxJob = { tx_id: string, block_hash: string, block_height: number };
export type ImportPendingTxJob = { tx_id: string, block_hash: string, block_height: number };
export type ImportBlockJob = { bundleId: number, txId: string } | { bundleId: number };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ImportBundleJob = { type: "ANS102" | "ANS104", tx_id: string };
export type ExportChunkJob = any;

export const importTxQueue = new MQ.Queue<any>("Import Tx Queue", MQ_REDIS_CONFIG);
export const importBundleQueue = new MQ.Queue<ImportBundleJob>("Import Bundle Queue", MQ_REDIS_CONFIG);
export const exportChunkQueue = new MQ.Queue<ExportChunkJob>("Export Chunk Queue", MQ_REDIS_CONFIG);

