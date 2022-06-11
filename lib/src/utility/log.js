"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mkWorkerLog = exports.log = void 0;
const tslib_1 = require("tslib");
const winston_1 = tslib_1.__importDefault(require("winston"));
const { createLogger, transports, format } = winston_1.default;
exports.log = createLogger({
    level: "info",
    transports: new transports.Console({
        format: format.simple(),
    }),
});
const mkWorkerLog = (messenger
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) => {
    return function (message, context) {
        if (messenger) {
            messenger.sendMessage({
                type: "log:info",
                message: `${message || ""}\n${typeof context === "object" ? JSON.stringify(context) : context || ""}`,
            });
        }
        else {
            context ? console.log(message, context) : console.log(message);
        }
    };
};
exports.mkWorkerLog = mkWorkerLog;
//# sourceMappingURL=log.js.map