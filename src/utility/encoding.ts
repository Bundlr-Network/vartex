import Ar from "arweave/node/ar";
import { types as CassandraTypes } from "cassandra-driver";
import * as B64js from "base64-js";
import { base32 } from "rfc4648";
import { createHash } from "node:crypto";
import { Readable, PassThrough, Transform } from "node:stream";
import { Tag } from "../types/arweave";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ar = new ((Ar as any).default as typeof Ar)();


export type Base64EncodedString = string;
export type Base64UrlEncodedString = string;
export type WinstonString = string;
export type ArString = string;
export type ISO8601DateTimeString = string;

export class Base64DUrlecode extends Transform {
  protected extra: string;
  protected bytesProcessed: number;

  constructor() {
    super({ decodeStrings: false, objectMode: false });
    this.extra = "";
    this.bytesProcessed = 0;
  }

  _transform(chunk: Buffer, encoding: unknown, callback: () => void): void {
    const conbinedChunk =
      this.extra +
      chunk
        .toString("base64")
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .replace(/(\r\n|\n|\r)/gm, "");

    this.bytesProcessed += chunk.byteLength;

    const remaining = chunk.length % 4;

    this.extra = conbinedChunk.slice(chunk.length - remaining);

    const buf = Buffer.from(
      conbinedChunk.slice(0, chunk.length - remaining),
      "base64"
    );
    this.push(buf);
    callback();
  }

  _flush(callback: () => void): void {
    if (this.extra.length > 0) {
      this.push(Buffer.from(this.extra, "base64"));
    }

    callback();
  }
}

export function b64UrlToBuffer(b64UrlString: string): Uint8Array {
  return new Uint8Array(B64js.toByteArray(b64UrlDecode(b64UrlString)));
}

export function b64UrlToStringBuffer(b64UrlString: string): Buffer {
  return Buffer.from(B64js.toByteArray(b64UrlDecode(b64UrlString)));
}

export function b64UrlDecode(b64UrlString: string): string {
  b64UrlString = b64UrlString.replace(/-/g, "+").replace(/_/g, "/");
  let padding;
  b64UrlString.length % 4 == 0
    ? (padding = 0)
    : (padding = 4 - (b64UrlString.length % 4));
  return [...b64UrlString, ..."=".repeat(padding)].join("");
}

export function sha256(buffer: Buffer): Buffer {
  return createHash("sha256").update(buffer).digest();
}

export function toB64url(buffer: Buffer): Base64UrlEncodedString {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function fromB64Url(input: Base64UrlEncodedString): Buffer {
  const paddingLength = input.length % 4 === 0 ? 0 : 4 - (input.length % 4);

  const base64 = [
    ...input.replace(/-/g, "+").replace(/_/g, "/"),
    ..."=".repeat(paddingLength),
  ].join("");

  return Buffer.from(base64, "base64");
}

export function fromB32(input: string): Buffer {
  return Buffer.from(
    base32.parse(input, {
      loose: true,
    })
  );
}

export function toB32(input: Buffer): string {
  return base32.stringify(input, { pad: false }).toLowerCase();
}

export function sha256B64Url(input: Buffer): string {
  return toB64url(createHash("sha256").update(input).digest());
}

export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  let buffer = Buffer.alloc(0);
  return new Promise((resolve) => {
    stream.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
    });

    stream.on("end", () => {
      resolve(buffer);
    });
  });
}

export async function streamToString(stream: Readable): Promise<string> {
  const buffer = await streamToBuffer(stream);
  return buffer.toString("utf8");
}

export function bufferToJson<T = unknown | undefined>(input: Buffer): T {
  try {
    return JSON.parse(input.toString("utf8"));
  } catch {
    console.error(
      `[encoding] unable to convert buffer to JSON ${input.toString("utf8")}`
    );
    return undefined;
  }
}

export function jsonToBuffer(input: unknown): Buffer {
  return Buffer.from(JSON.stringify(input));
}

export async function streamToJson<T = unknown | undefined>(
  input: Readable
): Promise<T> {
  return bufferToJson<T>(await streamToBuffer(input));
}

export function isValidUTF8(buffer: Buffer): boolean {
  return Buffer.compare(Buffer.from(buffer.toString(), "utf8"), buffer) === 0;
}

export function streamDecoderb64url(readable: Readable): Readable {
  const outputStream = new PassThrough({ objectMode: false });

  const decoder = new Base64DUrlecode();

  readable.pipe(decoder).pipe(outputStream);

  return outputStream;
}

export function bufferToStream(buffer: Buffer): Readable {
  return new Readable({
    objectMode: false,
    read() {
      this.push(buffer);
      this.push(undefined);
    },
  });
}

export function winstonToAr(amount: string): string {
  return ar.winstonToAr(amount);
}

export function arToWinston(amount: string): string {
  return ar.arToWinston(amount);
}

export function utf8DecodeTag(tag: Tag): Tag {
  let name;
  let value;
  try {
    const nameBuffer = fromB64Url(tag.name);
    if (isValidUTF8(nameBuffer)) {
      name = nameBuffer.toString("utf8");
    }
    const valueBuffer = fromB64Url(tag.value);
    if (isValidUTF8(valueBuffer)) {
      value = valueBuffer.toString("utf8");
    }
  } catch { }
  return {
    name,
    value,
  };
}

export function utf8DecodeTupleTag(tag: CassandraTypes.Tuple): Tag {
  let name;
  let value;
  try {
    const nameBuffer = fromB64Url(tag.get(0));
    if (isValidUTF8(nameBuffer)) {
      name = nameBuffer.toString("utf8");
    }
    const valueBuffer = fromB64Url(tag.get(1));
    if (isValidUTF8(valueBuffer)) {
      value = valueBuffer.toString("utf8");
    }
    // eslint-disable-next-line no-empty
  } catch { }
  return {
    name,
    value,
  };
}

export function ownerToAddress(owner: string): string {
  return toB64url(sha256(b64UrlToStringBuffer(owner)));
}
