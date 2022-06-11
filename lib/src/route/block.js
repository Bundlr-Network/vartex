"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockCurrentRoute = exports.blockByHashRoute = exports.blockByHeightRoute = void 0;
const tslib_1 = require("tslib");
const R = tslib_1.__importStar(require("rambda"));
const mapper_1 = require("../database/mapper");
const sync_1 = require("../database/sync");
function blockByHeightRoute(request, response, next) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (!request.params.height) {
            response.status(503);
            return next("Height value was not specified");
        }
        else {
            try {
                const height = request.params.height;
                const { block_hash } = yield mapper_1.blockHeightToHashMapper.get({
                    block_height: height,
                });
                if (!block_hash) {
                    next(`{error: "not_found"}`);
                    return;
                }
                const blockResult = yield mapper_1.blockMapper.get({
                    // height,
                    indep_hash: block_hash,
                });
                R.pipe(R.dissoc("txs_count"), (returnValue) => response.json(returnValue))(blockResult);
            }
            catch (error) {
                // Passes errors into the error handler
                next(JSON.stringify(error));
            }
        }
    });
}
exports.blockByHeightRoute = blockByHeightRoute;
function blockByHashRoute(request, response, next) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (!request.params.hash) {
            response.status(503);
            next("Height value was not specified");
        }
        else {
            try {
                const hash = request.params.hash;
                const blockResult = yield mapper_1.blockMapper.get({
                    indep_hash: hash,
                });
                if (!blockResult || !blockResult.height) {
                    response.status(404).json({
                        status: 404,
                        error: "Not Found",
                    });
                }
                R.pipe(R.dissoc("txs_count"), (returnValue) => response.json(returnValue))(blockResult);
            }
            catch (error) {
                // Passes errors into the error handler
                next(JSON.stringify(error));
            }
        }
    });
}
exports.blockByHashRoute = blockByHashRoute;
function blockCurrentRoute(request, response, next) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            const { block_hash } = yield mapper_1.blockHeightToHashMapper.get({
                block_height: sync_1.topHeight.toString(),
            });
            const blockResult = yield mapper_1.blockMapper.get({
                indep_hash: block_hash,
            });
            if (!blockResult) {
                response.status(404);
                return next("Current block was not found");
            }
            R.pipe(R.dissoc("txs_count"), (returnValue) => response.json(returnValue))(blockResult);
        }
        catch (error) {
            next(JSON.stringify(error));
        }
    });
}
exports.blockCurrentRoute = blockCurrentRoute;
//# sourceMappingURL=block.js.map