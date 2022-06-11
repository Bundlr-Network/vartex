"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ownerToAddress = exports.utf8DecodeTupleTag = exports.utf8DecodeTag = exports.arToWinston = exports.winstonToAr = exports.bufferToStream = exports.streamDecoderb64url = exports.isValidUTF8 = exports.streamToJson = exports.jsonToBuffer = exports.bufferToJson = exports.streamToString = exports.streamToBuffer = exports.sha256B64Url = exports.toB32 = exports.fromB32 = exports.fromB64Url = exports.toB64url = exports.sha256 = exports.b64UrlDecode = exports.b64UrlToStringBuffer = exports.b64UrlToBuffer = exports.Base64DUrlecode = void 0;
const tslib_1 = require("tslib");
const ar_1 = tslib_1.__importDefault(require("arweave/node/ar"));
const B64js = tslib_1.__importStar(require("base64-js"));
const rfc4648_1 = require("rfc4648");
const node_crypto_1 = require("node:crypto");
const node_stream_1 = require("node:stream");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ar = new ar_1.default.default();
class Base64DUrlecode extends node_stream_1.Transform {
    constructor() {
        super({ decodeStrings: false, objectMode: false });
        this.extra = "";
        this.bytesProcessed = 0;
    }
    _transform(chunk, encoding, callback) {
        const conbinedChunk = this.extra +
            chunk
                .toString("base64")
                .replace(/-/g, "+")
                .replace(/_/g, "/")
                .replace(/(\r\n|\n|\r)/gm, "");
        this.bytesProcessed += chunk.byteLength;
        const remaining = chunk.length % 4;
        this.extra = conbinedChunk.slice(chunk.length - remaining);
        const buf = Buffer.from(conbinedChunk.slice(0, chunk.length - remaining), "base64");
        this.push(buf);
        callback();
    }
    _flush(callback) {
        if (this.extra.length > 0) {
            this.push(Buffer.from(this.extra, "base64"));
        }
        callback();
    }
}
exports.Base64DUrlecode = Base64DUrlecode;
function b64UrlToBuffer(b64UrlString) {
    return new Uint8Array(B64js.toByteArray(b64UrlDecode(b64UrlString)));
}
exports.b64UrlToBuffer = b64UrlToBuffer;
function b64UrlToStringBuffer(b64UrlString) {
    return Buffer.from(B64js.toByteArray(b64UrlDecode(b64UrlString)));
}
exports.b64UrlToStringBuffer = b64UrlToStringBuffer;
function b64UrlDecode(b64UrlString) {
    b64UrlString = b64UrlString.replace(/-/g, "+").replace(/_/g, "/");
    let padding;
    b64UrlString.length % 4 == 0
        ? (padding = 0)
        : (padding = 4 - (b64UrlString.length % 4));
    return [...b64UrlString, ..."=".repeat(padding)].join("");
}
exports.b64UrlDecode = b64UrlDecode;
function sha256(buffer) {
    return (0, node_crypto_1.createHash)("sha256").update(buffer).digest();
}
exports.sha256 = sha256;
function toB64url(buffer) {
    return buffer
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}
exports.toB64url = toB64url;
function fromB64Url(input) {
    const paddingLength = input.length % 4 === 0 ? 0 : 4 - (input.length % 4);
    const base64 = [
        ...input.replace(/-/g, "+").replace(/_/g, "/"),
        ..."=".repeat(paddingLength),
    ].join("");
    return Buffer.from(base64, "base64");
}
exports.fromB64Url = fromB64Url;
function fromB32(input) {
    return Buffer.from(rfc4648_1.base32.parse(input, {
        loose: true,
    }));
}
exports.fromB32 = fromB32;
function toB32(input) {
    return rfc4648_1.base32.stringify(input, { pad: false }).toLowerCase();
}
exports.toB32 = toB32;
function sha256B64Url(input) {
    return toB64url((0, node_crypto_1.createHash)("sha256").update(input).digest());
}
exports.sha256B64Url = sha256B64Url;
function streamToBuffer(stream) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let buffer = Buffer.alloc(0);
        return new Promise((resolve) => {
            stream.on("data", (chunk) => {
                buffer = Buffer.concat([buffer, chunk]);
            });
            stream.on("end", () => {
                resolve(buffer);
            });
        });
    });
}
exports.streamToBuffer = streamToBuffer;
function streamToString(stream) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const buffer = yield streamToBuffer(stream);
        return buffer.toString("utf8");
    });
}
exports.streamToString = streamToString;
function bufferToJson(input) {
    try {
        return JSON.parse(input.toString("utf8"));
    }
    catch (_a) {
        console.error(`[encoding] unable to convert buffer to JSON ${input.toString("utf8")}`);
        return undefined;
    }
}
exports.bufferToJson = bufferToJson;
function jsonToBuffer(input) {
    return Buffer.from(JSON.stringify(input));
}
exports.jsonToBuffer = jsonToBuffer;
function streamToJson(input) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        return bufferToJson(yield streamToBuffer(input));
    });
}
exports.streamToJson = streamToJson;
function isValidUTF8(buffer) {
    return Buffer.compare(Buffer.from(buffer.toString(), "utf8"), buffer) === 0;
}
exports.isValidUTF8 = isValidUTF8;
function streamDecoderb64url(readable) {
    const outputStream = new node_stream_1.PassThrough({ objectMode: false });
    const decoder = new Base64DUrlecode();
    readable.pipe(decoder).pipe(outputStream);
    return outputStream;
}
exports.streamDecoderb64url = streamDecoderb64url;
function bufferToStream(buffer) {
    return new node_stream_1.Readable({
        objectMode: false,
        read() {
            this.push(buffer);
            this.push(undefined);
        },
    });
}
exports.bufferToStream = bufferToStream;
function winstonToAr(amount) {
    return ar.winstonToAr(amount);
}
exports.winstonToAr = winstonToAr;
function arToWinston(amount) {
    return ar.arToWinston(amount);
}
exports.arToWinston = arToWinston;
function utf8DecodeTag(tag) {
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
    }
    catch (_a) { }
    return {
        name,
        value,
    };
}
exports.utf8DecodeTag = utf8DecodeTag;
function utf8DecodeTupleTag(tag) {
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
    }
    catch (_a) { }
    return {
        name,
        value,
    };
}
exports.utf8DecodeTupleTag = utf8DecodeTupleTag;
function ownerToAddress(owner) {
    return toB64url(sha256(b64UrlToStringBuffer(owner)));
}
exports.ownerToAddress = ownerToAddress;
//# sourceMappingURL=encoding.js.map