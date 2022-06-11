"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataRoute = void 0;
const tslib_1 = require("tslib");
const got_1 = tslib_1.__importDefault(require("got"));
const mime_types_1 = require("mime-types");
const rambda_1 = require("rambda");
const node_stream_1 = require("node:stream");
const stream_chain_1 = tslib_1.__importDefault(require("stream-chain"));
const stream_json_1 = tslib_1.__importDefault(require("stream-json"));
const Pick_1 = tslib_1.__importDefault(require("stream-json/filters/Pick"));
const StreamValues_1 = tslib_1.__importDefault(require("stream-json/streamers/StreamValues"));
const mapper_1 = require("../database/mapper");
const transaction_1 = require("../query/transaction");
const node_1 = require("../query/node");
const encoding_1 = require("../utility/encoding");
class B64Transform extends node_stream_1.Transform {
    constructor(startOffset) {
        super();
        this.iterLength = startOffset;
    }
    _transform(chunk, encoding, callback) {
        // ensure string
        chunk = "" + chunk;
        // Add previous extra and remove any newline characters
        chunk = chunk.replace(/(\r\n|\n|\r)/gm, "");
        const buf = Buffer.from(chunk, "base64url");
        this.iterLength += buf.length;
        this.push(buf);
        callback();
    }
    _flush(callback) {
        callback();
    }
}
function recurNextChunk(response, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
pipeline, endOffset, nextOffset, retry = 0) {
    const passThru = new node_stream_1.PassThrough();
    const nodeGrab = (0, node_1.forEachNode)(retry);
    const chunkStream = got_1.default.stream(`${nodeGrab}/chunk/${nextOffset}`, {
        followRedirect: true,
    });
    let hasError = false;
    let pipeStarted = false;
    chunkStream.on("error", () => {
        hasError = true;
        if (retry < 4) {
            return recurNextChunk(response, pipeline, endOffset, nextOffset, retry + 1);
        }
        else {
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
            (0, rambda_1.head)(pipeline.streams)._expect = "value";
            return recurNextChunk(response, pipeline, endOffset, 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (0, rambda_1.last)(pipeline.streams).iterLength, 0);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (0, rambda_1.head)(pipeline.streams)._expect = "done";
            pipeline.on("end", response.end.bind(response));
            pipeline.end();
        }
    });
}
// C6IyOj4yAaJPaV8KuOG2jdf4gQCmpPisuE3eAUBdcUs
function dataRoute(request, response) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let firstPath;
        let subPath;
        if (!request.txid) {
            // sandbox-mode
            if (request.params["0"]) {
                firstPath = request.params["0"];
            }
            else if (!request.params["0"] && request.params["1"]) {
                firstPath = request.params["1"];
                if (request.params["2"]) {
                    subPath = request.params["2"];
                }
            }
        }
        else {
            subPath = request.originalUrl.replace(/^\//, "");
        }
        if (!firstPath) {
            response.sendStatus(404);
            return;
        }
        let txId = firstPath;
        let manifestSubpathContentType;
        if (subPath) {
            const manifestedIndex = yield mapper_1.permawebPathMapper.get({
                domain_id: txId,
                uri_path: "",
            });
            const manifestedSubpath = yield mapper_1.permawebPathMapper.get({
                domain_id: txId,
                uri_path: subPath,
            });
            if (manifestedSubpath) {
                txId = manifestedSubpath.target_id;
                manifestSubpathContentType = manifestedSubpath.content_type;
            }
            else if (manifestedIndex) {
                // SPA handle routing via index
                txId = manifestedIndex.target_id;
                manifestSubpathContentType = manifestedIndex.content_type;
            }
            else {
                // optimistic fallback
                txId = firstPath;
            }
        }
        const txDatabase = yield mapper_1.transactionMapper.get({ tx_id: txId });
        let txUpstream;
        if (!txDatabase) {
            try {
                txUpstream = yield (0, transaction_1.getTransaction)({ txId, retry: 2 });
            }
            catch (_a) {
                console.error(`tx ${txId} wasn't found`);
                response.sendStatus(404);
                return;
            }
        }
        let offset = yield mapper_1.txOffsetMapper.get({ tx_id: txId });
        if (!offset) {
            offset = yield (0, transaction_1.getTxOffset)({ txId });
        }
        if (offset) {
            const tags = txUpstream
                ? txUpstream.tags.map(encoding_1.utf8DecodeTag)
                : txDatabase.tags.map(encoding_1.utf8DecodeTupleTag);
            let contentType;
            if (manifestSubpathContentType) {
                contentType = manifestSubpathContentType;
            }
            else {
                for (const tag of tags) {
                    if (tag.name.toLowerCase() === "content-type") {
                        if (tag.value.startsWith("application/x.arweave-manifest")) {
                            const maybeIndex = yield mapper_1.permawebPathMapper.get({
                                domain_id: txId,
                                uri_path: "",
                            });
                            if (maybeIndex) {
                                txId = maybeIndex.target_id;
                                contentType = maybeIndex.content_type;
                                offset = yield mapper_1.txOffsetMapper.get({
                                    tx_id: maybeIndex.target_id,
                                });
                                if (!offset) {
                                    offset = yield (0, transaction_1.getTxOffset)({ txId: maybeIndex.target_id });
                                }
                            }
                            else if (!maybeIndex &&
                                (yield mapper_1.manifestQueueMapper.get({ tx_id: txId }))) {
                                response.statusMessage = "Pending import";
                                response.status(404).end();
                                return;
                            }
                            else {
                                // if invalid manifest or smth
                                // just show the data
                                contentType = tag.value;
                            }
                        }
                        else {
                            contentType = tag.value;
                        }
                    }
                    if (!contentType && tag.name.toLowerCase() === "filename") {
                        contentType = (0, mime_types_1.lookup)(tag.value) || undefined;
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
            const streamJsonParser = stream_json_1.default.parser();
            const pipeline = stream_chain_1.default.chain([
                streamJsonParser,
                Pick_1.default.pick({ filter: "chunk" }),
                StreamValues_1.default.streamValues(),
                (0, rambda_1.prop)("value"),
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
        }
        else {
            console.error(`offset for ${txId} wasn't found`);
            response.sendStatus(404);
        }
    });
}
exports.dataRoute = dataRoute;
//# sourceMappingURL=data.js.map