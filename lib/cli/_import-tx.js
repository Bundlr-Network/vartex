"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const import_tx_1 = require("../src/workers/import-tx");
// txId, blockHeight
const args = process.argv.slice(2);
(0, import_tx_1.importTx)(args[0], args[1]);
//# sourceMappingURL=_import-tx.js.map