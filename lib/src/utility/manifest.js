"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManifestV010 = void 0;
const zod_1 = require("zod");
exports.ManifestV010 = zod_1.z.object({
    manifest: zod_1.z.string().nonempty(),
    version: zod_1.z.string().nonempty(),
    index: zod_1.z.object({ path: zod_1.z.string(), ext: zod_1.z.string().optional() }).nullish(),
    paths: zod_1.z.record(zod_1.z.object({ id: zod_1.z.string(), ext: zod_1.z.string().optional() })),
});
//# sourceMappingURL=manifest.js.map