"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testEnvVars = void 0;
exports.testEnvVars = Object.assign(Object.assign({}, process.env), { PORT: "12482", ARWEAVE_NODES: '["http://localhost:12345"]', CASSANDRA_CONTACT_POINTS: process.env.CASSANDRA_CONTACT_POINTS || '["localhost:9042"]', CASSANDRA_USERNAME: "cassandra", CASSANDRA_PASSWORD: "cassandra", PARALLEL_TX_IMPORTS: "4", KEYSPACE: "testway", NODE_ENV: "test", POLLTIME_DELAY_SECONDS: "1", CACHE_IMPORT_PATH: "./cache/test-imports" });
process.env = exports.testEnvVars;
// bypass ts isolatedmodules check
exports.default = true;
//# sourceMappingURL=setup.js.map