"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ansBundles = exports.ansDeps = void 0;
const tslib_1 = require("tslib");
const arweave_1 = tslib_1.__importDefault(require("arweave"));
const deepHash_js_1 = tslib_1.__importDefault(require("arweave/node/lib/deepHash.js"));
const arweave_bundles_1 = tslib_1.__importDefault(require("arweave-bundles"));
exports.ansDeps = {
    utils: arweave_1.default.utils,
    crypto: arweave_1.default.crypto,
    deepHash: deepHash_js_1.default,
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.ansBundles = arweave_bundles_1.default.default(exports.ansDeps);
//# sourceMappingURL=bundles.js.map