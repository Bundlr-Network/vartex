import { Request, Response } from "express";
import { grabNode } from "../query/node";
import got from "got";
// import * as undici from "undici";
import axios from "axios";

export function proxyGetRoute(request: Request, response: Response): void {
  const uri = `${grabNode()}${request.originalUrl}`;
  const stream = got.stream.get(uri);
  stream.on("error", (error) => {
    response.status(404).json({
      status: 404,
      error: "Not Found: " + error,
    });

    console.log(`[GET] Failed to get: ${uri}`);
  });
  stream.on("end", () => response.end());
  stream.pipe(response);
}

export async function proxyPostRoute(request: Request, response: Response): Promise<void> {
  const uri = `${grabNode()}${request.originalUrl}`;
  try {
    console.log({
      uri,
      method: request.method as never,
      // body: request,
      headers: request.headers
    });

    const stream = await axios.post(uri, request.body, { headers: request.headers as Record<string, string>, responseType: "stream" });

    stream.data.on("error", console.error);
    stream.data.pipe(response);
  } catch (error) {
    console.error(`Error occurred while piping chunks to ${uri} - ${error}`);
  }

  // stream.body.on("error", (error) => {
  //   console.log(error);
  //
  //   response.status(503).send().end();
  //   console.log(`[POST] Failed to post: ${uri}`);
  // });
  // stream.on("end", () => response.end());
  // stream.on("error", (e) => {
  //   console.error(`Error occurred while piping chunks to ${uri} - ${e}`);
  //   response.status(500).end();
  // })
}
