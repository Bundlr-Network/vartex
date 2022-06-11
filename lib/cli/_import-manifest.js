"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const import_manifest_1 = require("../src/workers/import-manifest");
const args = process.argv.slice(2);
(0, import_manifest_1.importManifest)(args[0]).then((success) => process.exit(success ? 0 : 1));
//# sourceMappingURL=_import-manifest.js.map