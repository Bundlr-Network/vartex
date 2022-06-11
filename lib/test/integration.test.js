"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const R = tslib_1.__importStar(require("rambda"));
const got_1 = tslib_1.__importDefault(require("got"));
const cassandra_driver_1 = tslib_1.__importDefault(require("cassandra-driver"));
const fs_1 = require("fs");
const promises_1 = tslib_1.__importDefault(require("fs/promises"));
const globals_1 = require("@jest/globals");
const util_1 = tslib_1.__importDefault(require("util"));
const helpers = tslib_1.__importStar(require("./helpers"));
const PORT = parseInt(process.env.PORT);
const appState = new Map();
const exists = util_1.default.promisify(fs_1.exists);
const { blocks: tmpBlocks, txs: tmpTxs } = helpers.generateMockBlocks({
    totalBlocks: 100,
});
appState.set("mockBlocks", tmpBlocks);
appState.set("mockTxs", tmpTxs);
const tmpNextBlock = R.last(appState.get("mockBlocks"));
appState.set("lastBlockHeight", tmpNextBlock.height);
appState.set("lastBlockHash", tmpNextBlock.indep_hash);
let app;
let srv;
let proc;
let client;
function ensureCassandraClient() {
    client =
        client ||
            new cassandra_driver_1.default.Client({
                contactPoints: ["localhost:9042"],
                localDataCenter: "datacenter1",
            });
}
function ensureTestNode() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (!app && !srv) {
            const testNode = yield helpers.setupTestNode(appState);
            app = testNode.app;
            srv = testNode.srv;
        }
    });
}
describe("database sync test suite", function () {
    globals_1.jest.setTimeout(120000);
    beforeAll(function () {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield helpers.waitForCassandra();
            ensureCassandraClient();
            yield ensureTestNode();
        });
    });
    afterAll(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
        // wait a second for handlers to close
        yield new Promise((resolve) => setTimeout(resolve, 1000));
    }));
    afterEach(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield new Promise((resolve) => setTimeout(resolve, 1000));
    }));
    test("it writes 100 blocks into cassandra", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield client.execute("DROP KEYSPACE testway IF EXISTS");
        yield helpers.initDb();
        if (yield exists("./cache/hash_list_test.json")) {
            yield promises_1.default.unlink("./cache/hash_list_test.json");
        }
        yield helpers.killPortAndWait(PORT);
        const logs = yield helpers.runGatewayOnce({
            stopCondition: (log) => log ? /polling for new blocks/.test(log) : false,
        });
        const queryResponse = yield client.execute("SELECT COUNT(*) FROM testway.block ALLOW FILTERING");
        expect(queryResponse.rows[0].count.toString()).toEqual("100");
    }));
    test("it detects correctly fully synced db on startup", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield helpers.killPortAndWait(PORT);
        const logs = yield helpers.runGatewayOnce({});
        const queryResponse = yield client.execute("SELECT COUNT(*) FROM testway.block ALLOW FILTERING");
        expect(logs).not.toContain("database seems to be empty");
        expect(logs).not.toContain("Found missing block");
    }));
    // test("it starts polling and receives new blocks", async () => {
    //   let shouldStop = false;
    //   await helpers.killPortAndWait(PORT);
    //   const runp = helpers.runGatewayOnce({
    //     stopCondition: (log) => {
    //       if (log.includes("new block arrived at height 100")) {
    //         shouldStop = true;
    //       }
    //       return false;
    //     },
    //   });
    //   const { blocks: nextBlocks } = helpers.generateMockBlocks({
    //     totalBlocks: 1,
    //     offset: 100,
    //   });
    //   const nextBlock = nextBlocks[0];
    //   appState.set("mockBlocks", R.append(nextBlock, appState.get("mockBlocks")));
    //   appState.set("lastBlockHeight", nextBlock.height as number);
    //   appState.set("lastBlockHash", nextBlock.indep_hash as string);
    //   await pWaitFor(() => shouldStop);
    //   await new Promise((resolve) => setTimeout(resolve, 5000));
    //   // await runp;
    //   // await helpers.killPortAndWait(PORT);
    //   const queryResponse = await client.execute(
    //     "SELECT COUNT(*) FROM testway.block ALLOW FILTERING"
    //   );
    //   expect(queryResponse.rows[0].count.toString()).toEqual("101");
    // });
    test("it recovers when fork changes", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        let logs = "";
        let fullySyncPromiseResolve;
        let newForkPromiseResolve;
        yield helpers.killPortAndWait(PORT);
        const proc = helpers.startGateway();
        const logCallback = (log) => {
            if (/polling for new blocks/g.test(log.toString()) &&
                fullySyncPromiseResolve) {
                fullySyncPromiseResolve();
                fullySyncPromiseResolve = undefined;
            }
            if (/blocks are back in sync/g.test(log.toString()) &&
                newForkPromiseResolve) {
                newForkPromiseResolve();
                newForkPromiseResolve = undefined;
            }
            process.stderr.write(log);
            logs += log.toString();
        };
        proc.stderr.on("data", logCallback);
        proc.stdout.on("data", logCallback);
        yield new Promise((resolve, reject) => {
            fullySyncPromiseResolve = resolve;
        });
        let { blocks: nextFork } = helpers.generateMockBlocks({
            totalBlocks: 15,
            offset: 90,
            hashPrefix: "y",
        });
        appState.set("mockBlocks", R.splitWhen(R.propEq("height", 90))(appState.get("mockBlocks"))[0]);
        nextFork = R.concat([
            R.assoc("previous_block", R.last(appState.get("mockBlocks")).indep_hash, R.head(nextFork)),
        ], R.slice(1, nextFork.length, nextFork));
        appState.set("mockBlocks", R.concat(appState.get("mockBlocks"), nextFork));
        appState.set("lastBlockHeight", R.last(appState.get("mockBlocks")).height);
        appState.set("lastBlockHash", R.last(appState.get("mockBlocks")).indep_hash);
        yield new Promise((resolve, reject) => {
            newForkPromiseResolve = resolve;
            setTimeout(() => {
                if (resolve) {
                    resolve();
                    resolve = undefined;
                }
            }, 2000);
        });
        yield new Promise((resolve) => setTimeout(resolve, 1000));
        const queryResponse = yield client.execute("SELECT indep_hash,height FROM testway.block WHERE height>85 AND height<95 ALLOW FILTERING");
        const result = queryResponse.rows.map((obj) => ({
            height: parseInt(obj.height),
            hash: obj.indep_hash,
        }));
        expect(R.filter(R.equals({ height: 86, hash: "x86" }), result)).toHaveLength(1);
        expect(R.filter(R.equals({ height: 87, hash: "x87" }), result)).toHaveLength(1);
        expect(R.filter(R.equals({ height: 88, hash: "x88" }), result)).toHaveLength(1);
        expect(R.filter(R.equals({ height: 89, hash: "x89" }), result)).toHaveLength(1);
        expect(R.filter(R.equals({ height: 90, hash: "y90" }), result)).toHaveLength(1);
        expect(R.filter(R.equals({ height: 91, hash: "y91" }), result)).toHaveLength(1);
        expect(R.filter(R.equals({ height: 92, hash: "y92" }), result)).toHaveLength(1);
        proc.kill("SIGINT");
    }));
});
describe("graphql test suite", function () {
    globals_1.jest.setTimeout(120000);
    beforeAll(function () {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield helpers.waitForCassandra();
            ensureCassandraClient();
            yield ensureTestNode();
            const { blocks: mockBlocks, txs: mockTxs } = helpers.generateMockBlocks({
                totalBlocks: 100,
            });
            appState.set("mockBlocks", mockBlocks);
            appState.set("mockTxs", mockTxs);
        });
    });
    test("gql returns the last id", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield helpers.killPortAndWait(PORT);
        if (yield exists("./cache/hash_list_test.json")) {
            yield promises_1.default.unlink("./cache/hash_list_test.json");
        }
        yield client.execute("DROP KEYSPACE testway IF EXISTS");
        yield helpers.initDb();
        let shouldStop = false;
        let resolveReady;
        const ready = new Promise((resolve) => {
            resolveReady = resolve;
        });
        const runp = helpers.runGatewayOnce({
            stopCondition: (log) => {
                if (/polling for new blocks/g.test(log) && resolveReady) {
                    resolveReady();
                    resolveReady = undefined;
                }
                return shouldStop;
            },
        });
        yield ready;
        yield new Promise((resolve) => setTimeout(resolve, 1000));
        const gqlResponse = yield got_1.default
            .post(`http://localhost:${PORT}/graphql`, {
            json: {
                operationName: null,
                variables: {},
                query: `{
          transactions(first: 1) {
            edges {
              node {
                id
              }
            }
          }
        }`,
            },
            responseType: "json",
        })
            .json();
        expect(gqlResponse).toEqual({
            data: {
                transactions: {
                    edges: [
                        { node: { id: R.last(appState.get("mockTxs")).id } },
                    ],
                },
            },
        });
        shouldStop = true;
    }));
});
//# sourceMappingURL=integration.test.js.map