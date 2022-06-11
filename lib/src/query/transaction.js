"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagToB64 = exports.tagToUTF8 = exports.tagValue = exports.toB64url = exports.getTxOffset = exports.getTransaction = void 0;
const tslib_1 = require("tslib");
const got_1 = tslib_1.__importDefault(require("got"));
const encoding_1 = require("../utility/encoding");
const node_1 = require("./node");
function getTransaction({ txId, retry = 0, }) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const tryNode = (0, node_1.grabNode)();
        let jsonPayload;
        try {
            jsonPayload = yield got_1.default.get(`${tryNode}/tx/${txId}`, {
                responseType: "json",
                resolveBodyOnly: true,
            });
        }
        catch (_a) {
            // console.error(error.name, `${tryNode}/tx/${txId}`, "\n");
            (0, node_1.coolNode)(tryNode);
            if (retry > 100) {
                console.error("getTransaction: Failed to get txId: " + txId + " after 100 retries\n");
                return undefined;
                // process.exit(1);
            }
            yield new Promise(function (resolve) {
                setTimeout(resolve, 10);
            });
            return yield getTransaction({ txId, retry: retry + 1 });
        }
        (0, node_1.warmNode)(tryNode);
        return jsonPayload;
    });
}
exports.getTransaction = getTransaction;
function getTxOffset({ txId, retry = 0, }) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const tryNode = (0, node_1.grabNode)();
        let jsonPayload;
        try {
            jsonPayload = yield got_1.default.get(`${tryNode}/tx/${txId}/offset`, {
                responseType: "json",
                resolveBodyOnly: true,
            });
        }
        catch (_a) {
            (0, node_1.coolNode)(tryNode);
            if (retry > 100) {
                console.error("getTransaction: Failed to establish connection to any specified node after 100 retries\n");
                process.exit(1);
            }
            yield new Promise(function (resolve) {
                setTimeout(resolve, 10);
            });
            return yield getTxOffset({ txId, retry: retry + 1 });
        }
        (0, node_1.warmNode)(tryNode);
        return jsonPayload;
    });
}
exports.getTxOffset = getTxOffset;
function toB64url(input) {
    return Buffer.from(input)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}
exports.toB64url = toB64url;
function tagValue(tags, name) {
    for (const tag of tags) {
        if ((0, encoding_1.fromB64Url)(tag.name).toString().toLowerCase() === name.toLowerCase()) {
            return (0, encoding_1.fromB64Url)(tag.value).toString();
        }
    }
    return "";
}
exports.tagValue = tagValue;
function tagToUTF8(tags) {
    const conversion = [];
    for (const tag of tags) {
        conversion.push({
            name: (0, encoding_1.fromB64Url)(tag.name).toString(),
            value: (0, encoding_1.fromB64Url)(tag.value).toString(),
        });
    }
    return conversion;
}
exports.tagToUTF8 = tagToUTF8;
function tagToB64(tags) {
    const conversion = [];
    for (const tag of tags) {
        conversion.push({
            name: toB64url(tag.name),
            values: tag.values.map((v) => toB64url(v)),
        });
    }
    return conversion;
}
exports.tagToB64 = tagToB64;
//# sourceMappingURL=transaction.js.map