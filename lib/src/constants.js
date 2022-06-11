"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KEYSPACE = exports.isGatewayNodeModeEnabled = exports.env = void 0;
const envalid_1 = require("envalid");
const dotenv_1 = require("dotenv");
process.env.NODE_ENV !== "test" && (0, dotenv_1.config)();
exports.env = (0, envalid_1.cleanEnv)(process.env, {
    ARWEAVE_NODES: (0, envalid_1.json)({ default: ["https://arweave.net"] }),
    CASSANDRA_CONTACT_POINTS: (0, envalid_1.json)({ default: ["127.0.0.1:9042"] }),
    CASSANDRA_USERNAME: (0, envalid_1.str)({ default: "cassandra" }),
    CASSANDRA_PASSWORD: (0, envalid_1.str)({ default: "cassandra" }),
    PARALLEL_ANS102_IMPORT: (0, envalid_1.num)({ default: 2 }),
    PARALLEL_ANS104_IMPORT: (0, envalid_1.num)({ default: 2 }),
    PARALLEL_BLOCK_IMPORT: (0, envalid_1.num)({ default: 4 }),
    PARALLEL_MANIFEST_IMPORT: (0, envalid_1.num)({ default: 4 }),
    PARALLEL_TX_IMPORT: (0, envalid_1.num)({ default: 8 }),
    KEYSPACE: (0, envalid_1.str)({ default: "gateway" }),
    PORT: (0, envalid_1.port)({ default: 1248 }),
    // internal defs only applicable to master node
    OFFLOAD_MANIFEST_IMPORT: (0, envalid_1.bool)({ default: false }),
    OFFLOAD_ANS102_IMPORT: (0, envalid_1.bool)({ default: false }),
    OFFLOAD_ANS104_IMPORT: (0, envalid_1.bool)({ default: false }),
    OFFLOAD_TX_IMPORT: (0, envalid_1.bool)({ default: false }),
});
exports.isGatewayNodeModeEnabled = !!process.env["VARTEX_GW_NODE"];
exports.KEYSPACE = exports.env.KEYSPACE;
//# sourceMappingURL=constants.js.map