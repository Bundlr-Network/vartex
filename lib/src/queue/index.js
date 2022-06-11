"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importTxQueue = void 0;
const tslib_1 = require("tslib");
const MQ = tslib_1.__importStar(require("bullmq"));
const config_1 = require("./config");
exports.importTxQueue = new MQ.Queue("Bundle queues", { connection: config_1.REDIS_CONFIG.redis });
//# sourceMappingURL=index.js.map