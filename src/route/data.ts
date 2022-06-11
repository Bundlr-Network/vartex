import got from "got";
import { lookup as mimeLookup } from "mime-types";
import { head, last, prop } from "rambda";
import { Request, Response } from "express";
import { PassThrough, Transform } from "node:stream";
import StreamChain from "stream-chain";
import StreamJson from "stream-json";
import StreamJsonPick from "stream-json/filters/Pick";
import StreamJsonValues from "stream-json/streamers/StreamValues";
import {
  manifestQueueMapper,
  permawebPathMapper,
  transactionMapper,
  txOffsetMapper,
} from "../database/mapper";
import {
  TransactionType,
  getTransaction,
  getTxOffset,
} from "../query/transaction";
import { forEachNode } from "../query/node";
import { utf8DecodeTag, utf8DecodeTupleTag } from "../utility/encoding";

class B64Transform extends Transform {
  protected iterLength: number;

  constructor(startOffset: number) {
    super();
    this.iterLength = startOffset;
  }

  _transform(chunk: string, encoding: string, callback: () => void) {
    // ensure string
    chunk = "" + chunk;

    // Add previous extra and remove any newline characters
    chunk = chunk.replace(/(\r\n|\n|\r)/gm, "");

    const buf = Buffer.from(chunk, "base64url");
    this.iterLength += buf.length;
    this.push(buf);

    callback();
  }

  _flush(callback: () => void) {
    callback();
  }
}

function recurNextChunk(
  response: Response,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pipeline: any,
  endOffset: number,
  nextOffset: number,
  retry = 0
) {
  const passThru = new PassThrough();
  const nodeGrab: string = forEachNode(retry);

  const chunkStream = got.stream(`${nodeGrab}/chunk/${nextOffset}`, {
    followRedirect: true,
  });

  let hasError = false;
  let pipeStarted = false;

  chunkStream.on("error", () => {
    hasError = true;
    if (retry < 4) {
      return recurNextChunk(
        response,
        pipeline,
        endOffset,
        nextOffset,
        retry + 1
      );
    } else {
      response.end();
      passThru.unpipe(pipeline);
      chunkStream.unpipe(passThru);
      chunkStream.destroy();
    }
  });

  chunkStream.on("downloadProgress", () => {
    if (!pipeStarted && !hasError) {
      pipeStarted = true;
      chunkStream.pipe(passThru).pipe(pipeline);
    }
  });

  chunkStream.on("end", () => {
    if (nextOffset < endOffset) {
      chunkStream.unpipe(passThru);
      passThru.unpipe(pipeline);

      // maybe a bug in the library itself, but it stays otherwise
      // stuck in "done" state, here we restart the json parser
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      head<any>(pipeline.streams)._expect = "value";

      return recurNextChunk(
        response,
        pipeline,
        endOffset,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        last<any>(pipeline.streams).iterLength,
        0
      );
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      head<any>(pipeline.streams)._expect = "done";
      pipeline.on("end", response.end.bind(response));
      pipeline.end();
    }
  });
}

// C6IyOj4yAaJPaV8KuOG2jdf4gQCmpPisuE3eAUBdcUs
export async function dataRoute(
  request: Partial<Request & { txid?: string }>,
  response: Response
): Promise<void> {
  console.log("HIT");

  let firstPath: string;
  let subPath: string;

  console.log(request.txid);
  console.log(request.params);
  console.log(request.path);

  if (!request.params.txid || request.params.txid.match(/[\w-]{43}/i)?.length === 0) {
    // sandbox-mode
    if (request.params["0"]) {
      firstPath = request.params["0"];
    } else if (!request.params["0"] && request.params["1"]) {
      firstPath = request.params["1"];
      if (request.params["2"]) {
        subPath = request.params["2"];
      }
    }
  } else {
    subPath = request.originalUrl.replace(/^\//, "");
  }

  if (!firstPath) {
    console.log(`No firstPath - returning 404`);
    response.sendStatus(404);
    return;
  }

  let txId = firstPath;
  let manifestSubpathContentType: string;

  if (subPath) {
    const manifestedIndex = await permawebPathMapper.get({
      domain_id: txId,
      uri_path: "",
    });
    const manifestedSubpath = await permawebPathMapper.get({
      domain_id: txId,
      uri_path: subPath,
    });
    if (manifestedSubpath) {
      txId = manifestedSubpath.target_id;
      manifestSubpathContentType = manifestedSubpath.content_type;
    } else if (manifestedIndex) {
      // SPA handle routing via index
      txId = manifestedIndex.target_id;
      manifestSubpathContentType = manifestedIndex.content_type;
    } else {
      // optimistic fallback
      txId = firstPath;
    }
  }

  console.log(`Looking in db - ${txId}`);
  const txDatabase = await transactionMapper.get({ tx_id: txId });
  let txUpstream: TransactionType | undefined;

  if (!txDatabase) {
    console.log(`Not found in db - ${txId}`);
    try {
      txUpstream = await getTransaction({ txId, retry: 2 });
    } catch {
      console.error(`tx ${txId} wasn't found`);
      response.sendStatus(404);
      return;
    }
  }

  let offset = await txOffsetMapper.get({ tx_id: txId });

  if (!offset) {
    offset = await getTxOffset({ txId });
  }

  console.log(`Got offset - ${txId}`);

  if (offset) {
    const tags = txUpstream
      ? txUpstream.tags.map(utf8DecodeTag)
      : txDatabase.tags.map(utf8DecodeTupleTag);
    let contentType: string;

    if (manifestSubpathContentType) {
      contentType = manifestSubpathContentType;
    } else {
      for (const tag of tags as { name: string; value: string }[]) {
        if (tag.name.toLowerCase() === "content-type") {
          if (tag.value.startsWith("application/x.arweave-manifest")) {
            const maybeIndex = await permawebPathMapper.get({
              domain_id: txId,
              uri_path: "",
            });

            if (maybeIndex) {
              txId = maybeIndex.target_id;
              contentType = maybeIndex.content_type;

              offset = await txOffsetMapper.get({
                tx_id: maybeIndex.target_id,
              });

              if (!offset) {
                offset = await getTxOffset({ txId: maybeIndex.target_id });
              }
            } else if (
              !maybeIndex &&
              (await manifestQueueMapper.get({ tx_id: txId }))
            ) {
              response.statusMessage = "Pending import";
              response.status(404).end();
              return;
            } else {
              // if invalid manifest or smth
              // just show the data
              contentType = tag.value;
            }
          } else {
            contentType = tag.value;
          }
        }
        if (!contentType && tag.name.toLowerCase() === "filename") {
          contentType = mimeLookup(tag.value) || undefined;
        }
      }
    }

    const size = Number.parseInt(offset.size);
    const endOffset = Number.parseInt(offset.offset);
    const startOffset = endOffset - size + 1;

    response.set({
      "Content-Type": contentType || "text/plain",
      "Content-Length": size,
    });

    const b64Transform = new B64Transform(startOffset);
    const streamJsonParser = StreamJson.parser();

    const pipeline = StreamChain.chain([
      streamJsonParser,
      StreamJsonPick.pick({ filter: "chunk" }),
      StreamJsonValues.streamValues(),
      prop("value"),
      b64Transform,
    ]);

    pipeline.pipe(response);
    response.on("error", () => {
      response.end();
    });
    pipeline.on("error", () => {
      response.end();
    });

    recurNextChunk(response, pipeline, endOffset, startOffset);
  } else {
    console.error(`offset for ${txId} wasn't found`);
    response.sendStatus(404);
  }
}
