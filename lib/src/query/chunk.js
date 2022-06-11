"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChunk = void 0;
const tslib_1 = require("tslib");
const got_1 = tslib_1.__importDefault(require("got"));
const encoding_1 = require("../utility/encoding");
const node_1 = require("./node");
function getChunk({ offset, retryCount = 5, }) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const nodeGrab = (0, node_1.forEachNode)(retryCount);
        const mayebeMissingProtocol = nodeGrab.startsWith("http") ? "" : "http://";
        const chunkResponse = (yield got_1.default
            .get(`${mayebeMissingProtocol}${nodeGrab}/chunk/${offset}`, {
            responseType: "json",
        })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .catch((error) => {
            console.error(`${mayebeMissingProtocol}${nodeGrab}/chunk/${offset}`, error.message);
        }));
        if (chunkResponse &&
            typeof chunkResponse === "object" &&
            chunkResponse.statusCode >= 200 &&
            chunkResponse.statusCode < 300) {
            const { body } = chunkResponse;
            const chunkBuffer = Buffer.from((0, encoding_1.b64UrlToBuffer)(body.chunk));
            return {
                tx_path: body.tx_path,
                data_path: body.data_path,
                chunkSize: chunkBuffer.length,
                chunk: chunkBuffer,
            };
        }
        else {
            return retryCount > 0
                ? yield getChunk({
                    offset,
                    retryCount: retryCount - 1,
                })
                : undefined;
        }
    });
}
exports.getChunk = getChunk;
//# sourceMappingURL=chunk.js.map