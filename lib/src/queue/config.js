"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REDIS_CONFIG = void 0;
exports.REDIS_CONFIG = {
    redis: {
        host: process.env.REDIS_HOST,
        port: +process.env.REDIS_PORT,
        username: process.env.REDIS_USER,
        password: process.env.REDIS_PASSWORD,
    },
};
//# sourceMappingURL=config.js.map