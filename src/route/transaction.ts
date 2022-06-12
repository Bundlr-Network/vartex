import * as R from "rambda";
import { Request, Response, NextFunction } from "express";
import got from "got";
import { transactionMapper, txOffsetMapper } from "../database/mapper";
import { grabNode } from "../query/node";
import Transaction from "arweave/node/lib/transaction";

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

    const result = await got.post(`${host}/tx`, {
      followRedirect: true,
      json: request.body,
    });

    if ([400, 410].includes(result.statusCode)) {
      console.error("[broadcast-tx] failed", {
        id: tx.id,
        host,
        code: result.statusCode,
        error: result.statusMessage,
      });
      next(
        "[broadcast-tx] failed: " +
          JSON.stringify({
            id: tx.id,
            host,
            code: result.statusCode,
            error: result.statusMessage,
          })
      );
    }

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
