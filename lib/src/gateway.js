"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = exports.app = exports.session = void 0;
const tslib_1 = require("tslib");
require("colors");
const exit_hook_1 = tslib_1.__importDefault(require("exit-hook"));
const kill_port_1 = tslib_1.__importDefault(require("kill-port"));
const express_1 = tslib_1.__importDefault(require("express"));
const graphql_playground_middleware_express_1 = tslib_1.__importDefault(require("graphql-playground-middleware-express"));
const cors_1 = tslib_1.__importDefault(require("cors"));
const log_1 = require("./utility/log");
const server_1 = require("./graphql/server");
const data_1 = require("./route/data");
const block_1 = require("./route/block");
const status_1 = require("./route/status");
const transaction_1 = require("./route/transaction");
const proxy_1 = require("./route/proxy");
const hash_list_1 = require("./route/hash-list");
const cassandra_driver_1 = require("cassandra-driver");
const cassandra_1 = require("./database/cassandra");
const sync_1 = require("./database/sync");
const constants_1 = require("./constants");
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const { default: expressPlayground } = graphql_playground_middleware_express_1.default;
exports.session = {
    uuid: cassandra_driver_1.types.TimeUuid.fromDate(new Date()),
};
exports.app = (0, express_1.default)();
function poweredBy(r, response, next) {
    response.setHeader("X-Powered-By", "Vartex");
    if (next) {
        next();
    }
}
exports.app.enable("strict routing");
exports.app.use(poweredBy);
// app.use(expressSlash());
const dataPathRegex = new RegExp(/^\/?([\w-]{43})\/?$|^\/?([\w-]{43})\/(.*)$/i);
// 1. redirect domain.com/:txid -> txid.domain.org
// 2. route txid.domain.org -> domain.com/:txid
function permawebSandboxMiddleware(request, response, next) {
    if (request.subdomains &&
        request.subdomains.length > 0 &&
        /[\w-]{43}/.test(request.subdomains[0])) {
        request.txid = request.subdomains[0];
        (0, data_1.dataRoute)(request, response);
        return;
    }
    else if (request.originalUrl.replace(/^\//, "").replace(/\/.*/, "").length === 43) {
        const requestPath = request.originalUrl.replace(/^\//, "");
        const requestTxId = requestPath.replace(/\/.*/, "");
        const requestSubPath = requestPath.replace(/.*\//, "");
        const query = request.url.slice(request.path.length);
        response.redirect(302, `${request.protocol}://${requestTxId}.${request.host.endsWith(":80") || request.host.endsWith(":443")
            ? request.hostname
            : request.host}/${requestSubPath}${query}`);
        return;
    }
    else {
        next && next();
        return;
    }
}
// lack of slash causes permaweb apps to fetch from root domain.com/
// and not domain.com/path/
function appendSlashMiddleware(request, response, next) {
    const method = request.method.toLowerCase();
    // Skip when the req method is neither a GET nor a HEAD
    if (!["get", "head"].includes(method)) {
        next();
        return;
    }
    if (request.path.split("/").pop().includes(".")) {
        // Path has an extension. Do not add slash.
        next();
        return;
    }
    // 44 = / + txid
    if (request.path.length === 44 && request.path.slice(-1) !== "/") {
        const query = request.url.slice(request.path.length);
        response.redirect(302, `${request.path}/${query}`);
        return;
    }
    else if (/\/\//.test(request.path)) {
        // prevent double slashes
        const query = request.url.slice(request.path.length);
        const cleanPath = request.path.replace(/\/\//g, "/");
        response.redirect(302, `${cleanPath === "/" ? "" : cleanPath}/${query}`);
        return;
    }
    else {
        next();
        return;
    }
}
exports.app.use(permawebSandboxMiddleware);
exports.app.use(appendSlashMiddleware);
function start() {
    exports.app.set("trust proxy", 1);
    exports.app.set("query parser", "simple");
    exports.app.use((0, cors_1.default)());
    // app.use(jsonMiddleware);
    exports.app.get("/", status_1.statusRoute);
    exports.app.get("/status", status_1.statusRoute);
    exports.app.get("/info", proxy_1.proxyGetRoute);
    exports.app.get("/hash_list", hash_list_1.hashListRoute);
    exports.app.get("/tx/:id/offset", transaction_1.txOffsetRoute);
    exports.app.use("/tx/:id/status", proxy_1.proxyGetRoute);
    exports.app.get("/tx/:id", transaction_1.txGetByIdRoute);
    exports.app.get("/peers", proxy_1.proxyGetRoute);
    exports.app.get("/tx_anchor", proxy_1.proxyGetRoute);
    // db endpoints
    exports.app.get("/block/height/:height", block_1.blockByHeightRoute);
    exports.app.get("/block/hash/:hash", block_1.blockByHashRoute);
    exports.app.get("/block/current", block_1.blockCurrentRoute);
    exports.app.post("/tx", transaction_1.txUploadRoute);
    exports.app.post("/chunk", proxy_1.proxyPostRoute);
    exports.app.post("/wallet", proxy_1.proxyPostRoute);
    exports.app.post("/unsigned_tx", proxy_1.proxyPostRoute);
    exports.app.post("/api", proxy_1.proxyPostRoute);
    exports.app.get(/\/price.*/, proxy_1.proxyGetRoute);
    exports.app.get(/\/wallet.*/, proxy_1.proxyGetRoute);
    exports.app.use(dataPathRegex, data_1.dataRoute);
    // graphql endpoints
    const graphqlServer = (0, server_1.graphServer)({ introspection: true });
    graphqlServer.start().then(() => {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        graphqlServer.applyMiddleware({
            app: exports.app,
            path: "/graphql",
            subscriptionEndpoint: "/graphql",
            disableHealthCheck: true,
            schemaPolling: false,
        });
        // Everything else
        exports.app.all("*", (request, response) => {
            response.status(400).json({
                status: 400,
                error: "Not Found",
            });
        });
        (0, status_1.initializeStatusSession)(cassandra_1.cassandraClient, exports.session.uuid).then((sessionUuid) => {
            exports.session.uuid = sessionUuid;
            // just flush
            console.log("...");
            (0, sync_1.startSync)({ session: exports.session });
            if (constants_1.isGatewayNodeModeEnabled) {
                // recheck every minute if session changes
                setInterval(() => {
                    (0, status_1.initializeStatusSession)(cassandra_1.cassandraClient, exports.session.uuid).then((newSessionUuid) => {
                        exports.session.uuid = newSessionUuid;
                    });
                }, 60 * 1000);
            }
        });
    });
    exports.app.get("/graphql", expressPlayground({
        endpoint: "/graphql",
    }));
    exports.app.listen(constants_1.env.PORT || 1248, () => {
        log_1.log.info(`[app] Started on http://localhost:${constants_1.env.PORT || 1248}`);
        if (constants_1.isGatewayNodeModeEnabled) {
            log_1.log.info(`[app] - Gateway only node (no imports of new blocks will be performed)`);
        }
        else {
            log_1.log.info(`[app] - Parallel import of blocks: ${constants_1.env.PARALLEL_BLOCK_IMPORT}`);
            if (constants_1.env.OFFLOAD_TX_IMPORT) {
                log_1.log.info(`[app] - Imports of incoming transactions is offloaded\n` +
                    `make sure you are running import txs elsewhere, otherwise the tx import queue will grow big fast!`);
            }
            else {
                log_1.log.info(`[app] - Parallel import of incoming transactions: ${constants_1.env.PARALLEL_TX_IMPORT}`);
            }
            if (constants_1.env.OFFLOAD_MANIFEST_IMPORT) {
                log_1.log.info(`[app] - Imports of incoming manifests is offloaded\n` +
                    `make sure you are running import manifests elsewhere if you indend to import them!`);
            }
            else {
                log_1.log.info(`[app] - Parallel import of manifests: ${constants_1.env.PARALLEL_MANIFEST_IMPORT}`);
            }
            if (constants_1.env.OFFLOAD_ANS102_IMPORT) {
                log_1.log.info(`[app] - Imports of incoming ANS-102 bundles is offloaded\n` +
                    `make sure you are running import ans102 elsewhere if you indend to import them!`);
            }
            else {
                log_1.log.info(`[app] - Parallel import of ANS102 bundles: ${constants_1.env.PARALLEL_ANS102_IMPORT}`);
            }
            if (constants_1.env.OFFLOAD_ANS104_IMPORT) {
                log_1.log.info(`[app] - Imports of incoming ANS-104 bundles is offloaded\n` +
                    `make sure you are running import ans104 elsewhere if you indend to import them!`);
            }
            else {
                log_1.log.info(`[app] - Parallel import of ANS104 bundles: ${constants_1.env.PARALLEL_ANS104_IMPORT}`);
            }
            log_1.log.info(`[app] - Your upstream peers are: ${constants_1.env.ARWEAVE_NODES.join(", ")}`);
        }
    });
}
exports.start = start;
(0, exit_hook_1.default)(() => (0, kill_port_1.default)(constants_1.env.PORT || 1248));
start();
//# sourceMappingURL=gateway.js.map