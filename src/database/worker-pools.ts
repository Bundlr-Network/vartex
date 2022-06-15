import "colors";
import * as R from "rambda";
import { WorkerPool } from "../gatsby-worker";
import { MessagesFromWorker } from "../workers/message-types";
import { env } from "../constants";
import { log } from "../utility/log";

const processEnv: Record<string, string> = R.mergeAll([
  {
    PWD: process.cwd(),
    TS_NODE_FILES: true,
    NODE_PATH: process.cwd() + "/node_modules",
    NODE_OPTIONS: `--require ${
      process.cwd() + "/node_modules/ts-node/register"
    }`,
  },
  process.env,
]);

function logFilter(data: string): boolean {
  return (
    !/ExperimentalWarning:/.test(data) && !/node --trace-warnings/.test(data)
  );
}

interface WorkerReadyWait {
  [index: string]: {
    promise: Promise<void>;
    resolve: () => void;
  };
}

export const workerReadyPromises: WorkerReadyWait = {};

function appendWorkerReadyPromises(
  workerPoolPrefix: string,
  workerCount: number
): void {
  for (const workerIndex of R.range(1, workerCount + 1)) {
    let resolve: () => void;
    const promise = new Promise<void>((resolve_: () => void) => {
      resolve = resolve_;
    });

    workerReadyPromises[workerPoolPrefix + ":" + workerIndex] = {
      promise,
      resolve,
    };
  }
}

function onWorkerMessage(message: MessagesFromWorker, workerId: string): void {
  switch (message.type) {
    case "worker:ready": {
      workerReadyPromises[workerId].resolve();
      break;
    }
    case "log:info": {
      if (message.message && message.message !== "{}") {
        log.info(`[${workerId}] ${message.message}`.blue);
      }

      break;
    }
    case "log:warn": {
      if (message.message && message.message !== "{}") {
        log.info(`[${workerId}] ${message.message}`.yellow);
      }
      break;
    }
    case "log:error": {
      if (message.message && message.message !== "{}") {
        log.info(`[${workerId}] ${message.message}`.red);
      }
      break;
    }
    default: {
      log.error("[${workerId}] unknown worker message arrived".yellow, message);
    }
  }
}

appendWorkerReadyPromises("import-block", env.PARALLEL_BLOCK_IMPORT + 1);

export const blockImportWorkerPool = new WorkerPool<
  typeof import("../workers/main")
>(process.cwd() + "/src/workers/main", {
  workerPoolPrefix: "import-block",
  numWorkers: env.PARALLEL_BLOCK_IMPORT + 1,
  logFilter,
  env: processEnv,
});

appendWorkerReadyPromises("import-manifest", env.PARALLEL_MANIFEST_IMPORT + 1);

export const manifestImportWorkerPool = new WorkerPool<
  typeof import("../workers/main")
>(process.cwd() + "/src/workers/main", {
  workerPoolPrefix: "import-manifest",
  numWorkers: env.PARALLEL_MANIFEST_IMPORT + 1,
  logFilter,
  env: processEnv,
});


/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
(blockImportWorkerPool.onMessage as any)(onWorkerMessage);
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
(txsImportWorkerPool.onMessage as any)(onWorkerMessage);
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
(manifestImportWorkerPool.onMessage as any)(onWorkerMessage);
