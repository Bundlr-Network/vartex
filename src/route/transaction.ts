import * as R from "rambda";
import { Request, Response, NextFunction } from "express";
import { transactionMapper, txOffsetMapper } from "../database/mapper";
import { grabNode } from "../query/node";
import Transaction from "arweave/node/lib/transaction";
import { types } from "cassandra-driver";
import Tuple = types.Tuple;
import { importTxQueue } from "../queue";
import { proxyGetRoute } from "./proxy";
import axios from "axios";
import { makeError } from "./utils";

export async function txUploadRoute(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    console.log(request.body);
    const tx = request.body as Transaction;
    if (!tx) {
      console.log("No tx provided");
      response.sendStatus(400).end();
      return;
    }
    console.log(`[new-tx] broadcast tx ${tx.id}`);

    const host = grabNode();

    console.log(`${host}/tx`);

    console.log(request.headers);
    let result;
    try {
      result = await axios.post(`${host}/tx`, request.body, {
        headers: {
          "X-Network": process.env.NETWORK
        }
      });
    } catch (error) {
      console.error(error)
      console.error("[broadcast-tx] failed", {
        id: tx.id,
        host,
        code: result.status,
        error: result.statusText,
      });
      next(
          "[broadcast-tx] failed: " +
          JSON.stringify({
            id: tx.id,
            host,
            code: result.status,
            error: result.statusText,
          })
      );
      return makeError(response, 400);
    }

    delete tx.data;
    await importTxQueue.add("Import Pending Tx", {
      ...tx
    }, {
      delay: 2000
    });

    response.sendStatus(200).end();
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
}

export async function txGetByIdRoute(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const txId = request.params.id;
    const rawTx = await transactionMapper.get({
      tx_id: txId,
    });
    console.log(rawTx)
    if (!rawTx) {
      return proxyGetRoute(request, response);
    }

    rawTx.tags = (rawTx.tags as Array<Tuple>)?.map(e => ({ name: e.get(0), value: e.get(1) })) ?? [];
    response.json(R.pipe(R.dissoc("tag_count"), R.dissoc("tx_index"))(rawTx));
  } catch (error) {
    next(error);
  }
}

export async function txOffsetRoute(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const txId = request.params.id;
    const rawTx = await txOffsetMapper.get({
      tx_id: txId,
    });
    response.json(R.dissoc("tx_id")(rawTx || { size: 0, offset: -1 }));
  } catch (error) {
    next(error);
  }
}
