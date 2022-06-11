"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentBlock = exports.fetchBlockByHash = exports.getBlock = void 0;
const tslib_1 = require("tslib");
const got_1 = tslib_1.__importDefault(require("got"));
const log_1 = require("../utility/log");
const node_1 = require("./node");
// get block by hash is optional (needs proper decoupling)
function getBlock({ hash, height, }) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const tryNode = (0, node_1.grabNode)();
        const url = hash
            ? `${tryNode}/block/hash/${hash}`
            : `${tryNode}/block/height/${height}`;
        let body;
        try {
            body = (yield got_1.default.get(url, {
                responseType: "json",
                resolveBodyOnly: true,
                followRedirect: true,
            }));
        }
        catch (error) {
            (0, node_1.coolNode)(tryNode);
            if (error instanceof got_1.default.TimeoutError) {
                log_1.log.error(`fetching block timed out: ${url}, retry...`);
            }
            else if (error instanceof got_1.default.HTTPError) {
                log_1.log.error(`error while fetching block: ${url}, retry...`);
            }
        }
        if (!body) {
            return getBlock({ hash, height });
        }
        if (hash && height !== body.height) {
            log_1.log.error([height, typeof height, body.height, typeof body.height].join(" "));
            log_1.log.error("fatal inconsistency: hash and height dont match for hash." +
                "wanted: " +
                hash +
                " got: " +
                body.indep_hash +
                "\nwanted: " +
                height +
                " got: " +
                body.height +
                " while requesting " +
                url);
            // REVIEW: does assuming re-forking condition work better than fatal error?
            process.exit(1);
        }
        if (body.cumulative_diff) { // HACK: Fix some cumulative_diff is number
            body.cumulative_diff = body.cumulative_diff.toString();
        }
        (0, node_1.warmNode)(tryNode);
        return body;
    });
}
exports.getBlock = getBlock;
function fetchBlockByHash(hash) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const tryNode = (0, node_1.grabNode)();
        const url = `${tryNode}/block/hash/${hash}`;
        let body;
        try {
            body = (yield got_1.default.get(url, {
                responseType: "json",
                resolveBodyOnly: true,
                followRedirect: true,
            }));
        }
        catch (_a) {
            (0, node_1.coolNode)(tryNode);
        }
        if (!body) {
            return fetchBlockByHash(hash);
        }
        (0, node_1.warmNode)(tryNode);
        return body;
    });
}
exports.fetchBlockByHash = fetchBlockByHash;
function currentBlock() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const tryNode = (0, node_1.grabNode)();
        let jsonPayload;
        try {
            jsonPayload = yield got_1.default.get(`${tryNode}/block/current`, {
                responseType: "json",
                resolveBodyOnly: true,
                timeout: 15 * 1000,
            });
        }
        catch (_a) {
            (0, node_1.coolNode)(tryNode);
            return undefined;
        }
        (0, node_1.warmNode)(tryNode);
        return jsonPayload;
    });
}
exports.currentBlock = currentBlock;
//# sourceMappingURL=block.js.map