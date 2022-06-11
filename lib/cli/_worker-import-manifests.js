"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const p_min_delay_1 = tslib_1.__importDefault(require("p-min-delay"));
const p_whilst_1 = tslib_1.__importDefault(require("p-whilst"));
const exit_hook_1 = tslib_1.__importDefault(require("exit-hook"));
const import_manifest_1 = require("../src/workers/import-manifest");
let exitSignaled = false;
(0, exit_hook_1.default)(() => {
    exitSignaled = true;
});
(() => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    console.log("starting import-manifests worker...");
    (0, p_whilst_1.default)(() => !exitSignaled, () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        try {
            yield p_min_delay_1.default((0, import_manifest_1.importManifests)(), 120 * 1000);
        }
        catch (error) {
            console.error(error);
        }
    }));
}))();
//# sourceMappingURL=_worker-import-manifests.js.map