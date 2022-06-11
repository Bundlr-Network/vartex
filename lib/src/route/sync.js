"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRoute = exports.start = void 0;
const tslib_1 = require("tslib");
const sync_1 = require("../database/sync");
const cassandra_1 = require("../database/cassandra");
const node_1 = require("../query/node");
exports.start = Date.now();
function syncRoute(request, response) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // const info = await getNodeInfo({ maxRetry: 1, keepAlive: true });
        const info = yield (0, node_1.getNodeInfo)({ maxRetry: 1 });
        if (info) {
            const delta = (0, cassandra_1.toLong)(info.height).sub(sync_1.gatewayHeight);
            const status = delta.lt(3) ? 200 : 400;
            response.status(status).send({
                status: "OK",
                gatewayHeight: sync_1.gatewayHeight.toString(),
                arweaveHeight: info.height,
                delta: delta.toString(),
            });
        }
        else {
            response.status(404).send();
        }
    });
}
exports.syncRoute = syncRoute;
//# sourceMappingURL=sync.js.map