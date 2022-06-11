"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusRoute = exports.initializeStatusSession = void 0;
const tslib_1 = require("tslib");
const R = tslib_1.__importStar(require("rambda"));
const mapper_1 = require("../database/mapper");
const constants_1 = require("../constants");
const git_rev_sync_1 = tslib_1.__importDefault(require("git-rev-sync"));
let gitRevision = "unknown";
let ready = false;
let lastKnownSessionUuid;
function signalReady() {
    setTimeout(() => {
        if (!ready) {
            try {
                gitRevision = git_rev_sync_1.default.long([process.cwd()]);
            }
            catch (_a) { }
            ready = true;
        }
    }, 2000);
}
const initializeStatusSession = (cassandraClient, sessionUuid) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    let maybeLastSession;
    let lastSession = {
        status: "BOOTING",
        arweave_height: "0",
        gateway_height: "0",
        vartex_git_revision: gitRevision,
        current_imports: [],
        current_migrations: {},
    };
    try {
        maybeLastSession = yield cassandraClient.execute(`SELECT * FROM ${constants_1.KEYSPACE}.status`);
    }
    catch (_a) { }
    if (!maybeLastSession) {
        yield new Promise((resolve) => setTimeout(resolve, 1000));
        return (0, exports.initializeStatusSession)(cassandraClient, sessionUuid);
    }
    else if (constants_1.isGatewayNodeModeEnabled && !R.isEmpty(maybeLastSession.rows)) {
        signalReady();
        lastKnownSessionUuid = maybeLastSession.rows[0].session;
        return lastKnownSessionUuid;
    }
    else if (constants_1.isGatewayNodeModeEnabled && R.isEmpty(maybeLastSession.rows)) {
        lastKnownSessionUuid = sessionUuid;
        signalReady();
        return lastKnownSessionUuid;
    }
    if (!R.isEmpty(maybeLastSession.rows)) {
        for (const { session } of maybeLastSession.rows) {
            yield cassandraClient.execute(`DELETE FROM ${constants_1.KEYSPACE}.status WHERE session = ${session} IF EXISTS`);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lastSession = maybeLastSession.rows[0];
    }
    const newSession = R.mergeAll([
        lastSession,
        { session: sessionUuid, status: "BOOTING" },
    ]);
    try {
        yield mapper_1.statusMapper.insert(newSession);
    }
    catch (_b) {
        yield new Promise((resolve) => setTimeout(resolve, 1000));
        return (0, exports.initializeStatusSession)(cassandraClient, sessionUuid);
    }
    signalReady();
    lastKnownSessionUuid = sessionUuid;
    return lastKnownSessionUuid;
});
exports.initializeStatusSession = initializeStatusSession;
function statusRoute(request, response) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (!ready) {
            response.send("not ready");
        }
        else {
            let currentStatus;
            try {
                currentStatus = yield mapper_1.statusMapper.get({
                    session: lastKnownSessionUuid,
                });
            }
            catch (_a) { }
            try {
                const delta = Number.parseInt(currentStatus ? currentStatus.arweave_height : "0") -
                    Number.parseInt(currentStatus ? currentStatus.gateway_height : "0");
                response.status(200).send(Object.assign(Object.assign({ delta }, currentStatus), { vartex_git_revision: gitRevision }));
            }
            catch (error) {
                response.send(`${error}`);
            }
        }
    });
}
exports.statusRoute = statusRoute;
//# sourceMappingURL=status.js.map