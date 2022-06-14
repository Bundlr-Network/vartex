import { Request, Response } from "express";
import { request as r } from "undici";
import { grabNode } from "../query/node";

export async function peers(request: Request, response: Response): Promise<void> {
    const peers = await r(`${grabNode()}/peers`)
        .then(r => r.body.json());

    response.contentType("application/json");
    response.send([...process.env.ARWEAVE_NODES, ...peers]);
}