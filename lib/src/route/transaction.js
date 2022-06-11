"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.txOffsetRoute = exports.txGetByIdRoute = exports.txUploadRoute = void 0;
const tslib_1 = require("tslib");
const R = tslib_1.__importStar(require("rambda"));
const got_1 = tslib_1.__importDefault(require("got"));
const mapper_1 = require("../database/mapper");
const node_1 = require("../query/node");
function txUploadRoute(request, response, next) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            const tx = request.body;
            console.log(`[new-tx] broadcast tx ${tx.id}`);
            const host = (0, node_1.grabNode)();
            const result = yield got_1.default.post(`${host}/tx`, {
                followRedirect: true,
                json: request.body,
            });
            if ([400, 410].includes(result.statusCode)) {
                console.error("[broadcast-tx] failed", {
                    id: tx.id,
                    host,
                    code: result.statusCode,
                    error: result.statusMessage,
                });
                next("[broadcast-tx] failed: " +
                    JSON.stringify({
                        id: tx.id,
                        host,
                        code: result.statusCode,
                        error: result.statusMessage,
                    }));
            }
            response.sendStatus(200).end();
        }
        catch (error) {
            console.log(error);
            response.status(500).send(error);
        }
    });
}
exports.txUploadRoute = txUploadRoute;
function txGetByIdRoute(request, response, next) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            const txId = request.params.id;
            const rawTx = yield mapper_1.transactionMapper.get({
                tx_id: txId,
            });
            response.json(R.pipe(R.dissoc("tag_count"), R.dissoc("tx_index"))(rawTx));
        }
        catch (error) {
            next(error);
        }
    });
}
exports.txGetByIdRoute = txGetByIdRoute;
function txOffsetRoute(request, response, next) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            const txId = request.params.id;
            const rawTx = yield mapper_1.txOffsetMapper.get({
                tx_id: txId,
            });
            response.json(R.dissoc("tx_id")(rawTx || { size: 0, offset: -1 }));
        }
        catch (error) {
            next(error);
        }
    });
}
exports.txOffsetRoute = txOffsetRoute;
//# sourceMappingURL=transaction.js.map