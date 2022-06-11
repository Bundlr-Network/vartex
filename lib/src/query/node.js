"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDataFromChunks = exports.getData = exports.getHashList = exports.getNodeInfo = exports.coolNode = exports.warmNode = exports.grabNode = exports.forEachNode = exports.NODES = void 0;
const tslib_1 = require("tslib");
const promises_1 = tslib_1.__importDefault(require("node:fs/promises"));
const R = tslib_1.__importStar(require("rambda"));
const random_weighted_choice_1 = tslib_1.__importDefault(require("random-weighted-choice"));
const got_1 = tslib_1.__importDefault(require("got"));
const log_1 = require("../utility/log");
const chunk_1 = require("./chunk");
let temporaryNodes = [];
try {
    temporaryNodes = process.env.ARWEAVE_NODES
        ? JSON.parse(process.env.ARWEAVE_NODES)
        : ["http://lon-4.eu-west-1.arweave.net:1984"];
}
catch (_a) {
    console.error("[node] invalid list of nodes.");
}
exports.NODES = temporaryNodes;
let nodeTemperatures = [];
const syncNodeTemperatures = () => {
    nodeTemperatures = exports.NODES.map((url) => {
        const previousWeight = nodeTemperatures.find((index) => index.id === url);
        return {
            id: url,
            weight: previousWeight ? previousWeight.weight : 1,
        };
    });
};
// iterates the nodes, high temperatures first
function forEachNode(index) {
    if (R.isEmpty(nodeTemperatures)) {
        syncNodeTemperatures();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return R.pipe(R.sortBy(R.prop("weight")), R.nth(index % nodeTemperatures.length), R.prop("id"))(nodeTemperatures);
}
exports.forEachNode = forEachNode;
function grabNode() {
    R.isEmpty(nodeTemperatures) && syncNodeTemperatures();
    let randomWeightedNode = (0, random_weighted_choice_1.default)(nodeTemperatures);
    if (!randomWeightedNode) {
        if (R.isEmpty(nodeTemperatures)) {
            throw new Error("No more peers were found");
        }
        else {
            randomWeightedNode = nodeTemperatures[0].id;
        }
    }
    return randomWeightedNode.startsWith("http")
        ? randomWeightedNode
        : `http://${randomWeightedNode}`;
}
exports.grabNode = grabNode;
function warmNode(url) {
    const item = nodeTemperatures.find((index) => index.id === url);
    if (item) {
        item["weight"] = Math.min(item["weight"] + 1, 99);
    }
}
exports.warmNode = warmNode;
function coolNode(url, kickIfLow = false) {
    const item = nodeTemperatures.find((index) => index.id === url);
    if (item) {
        if (kickIfLow && item["weight"] < 2) {
            log_1.log.info(`[network] peer ${url} is not responding well, if at all, consider removing this node from your list of peers`);
            // nodeTemperatures = R.reject((temporary: WeightedNode) =>
            //   R.equals(R.prop("id", temporary), url)
            // )(nodeTemperatures) as WeightedNode[];
        }
        item["weight"] = Math.max(item["weight"] - 1, 1);
    }
}
exports.coolNode = coolNode;
function getNodeInfo({ retry = 0, maxRetry = 100, }) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const tryNode = grabNode();
        try {
            const body = yield got_1.default.get(`${tryNode}/info`, {
                responseType: "json",
                resolveBodyOnly: true,
                followRedirect: true,
            });
            warmNode(tryNode);
            return {
                network: body.network,
                version: body.version,
                release: body.release,
                height: body.height,
                current: body.current,
                blocks: body.blocks,
                peers: body.peers,
                queue_length: body.queue_length,
                node_state_latency: body.node_state_latency,
            };
        }
        catch (_a) {
            coolNode(tryNode, true);
            return new Promise((resolve) => setTimeout(resolve, 10 + 2 * retry)).then(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
                if (retry < maxRetry) {
                    return yield getNodeInfo({ retry: retry + 1, maxRetry });
                }
                else {
                    console.error("\n" +
                        "getNodeInfo: failed to establish connection to any specified node after 100 retries with these nodes: " +
                        nodeTemperatures.map(R.prop("id")).join(", ") +
                        "\n");
                    console.error("\n" +
                        "Check the network status, trying again to reach some of these nodes, but it is unlikely to make a differnece:" +
                        nodeTemperatures.map(R.prop("id")).join(", ") +
                        "\n");
                    return yield getNodeInfo({ retry: 0, maxRetry });
                }
            }));
        }
    });
}
exports.getNodeInfo = getNodeInfo;
const hashListCachePath = process.env.NODE_ENV === "test"
    ? "cache/hash_list_test.json"
    : "cache/hash_list.json";
function getHashList({ retry = 0, }) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const tryNode = grabNode();
        const url = `${tryNode}/hash_list`;
        if (retry < 1) {
            // looks very wrong when this is repeatedly printed
            log_1.log.info("[database] fetching the hash_list, this may take a while...");
        }
        try {
            const body = yield got_1.default.get(url, {
                responseType: "json",
                resolveBodyOnly: true,
                followRedirect: true,
            });
            const linearHashList = R.reverse(body);
            return promises_1.default
                .writeFile(hashListCachePath, JSON.stringify(linearHashList, undefined, 2))
                .then(() => linearHashList);
        }
        catch (error) {
            process.env.NODE_ENV === "test" && console.error(error);
            coolNode(tryNode);
            return new Promise((resolve) => setTimeout(resolve, 10 + 2 * retry)).then(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
                if (retry < 100) {
                    return yield getHashList({ retry: retry + 1 });
                }
                else {
                    console.error("getHashList: failed to establish connection to any specified node after 100 retries\n");
                    process.exit(1);
                }
            }));
        }
    });
}
exports.getHashList = getHashList;
function getData(id) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        return yield got_1.default.get(`${grabNode()}/${id}`);
    });
}
exports.getData = getData;
function getDataFromChunks({ startOffset, endOffset, }) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let byte = 0;
        let chunks = Buffer.from("");
        let error = false;
        while (!error && startOffset.add(byte).lt(endOffset)) {
            let chunk;
            try {
                chunk = yield (0, chunk_1.getChunk)({
                    offset: startOffset.add(byte).toString(),
                });
            }
            catch (_a) {
                error = true;
                break;
            }
            if (chunk) {
                byte += chunk.chunkSize;
                chunks = Buffer.concat([chunks, chunk.chunk]);
            }
            else {
                error = true;
                break;
            }
        }
        return error ? undefined : chunks;
    });
}
exports.getDataFromChunks = getDataFromChunks;
//# sourceMappingURL=node.js.map