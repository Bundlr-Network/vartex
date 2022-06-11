"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessenger = exports.isWorker = void 0;
const types_1 = require("./types");
const utils_1 = require("./utils");
/**
 * Used to check wether current context is executed in worker process
 */
let isWorker = false;
exports.isWorker = isWorker;
let getMessenger = function () {
    return undefined;
};
exports.getMessenger = getMessenger;
if (process.send && process.env.GATSBY_WORKER_MODULE_PATH) {
    exports.isWorker = isWorker = true;
    const listeners = [];
    const ensuredSendToMain = process.send.bind(process);
    function onError(error) {
        if (error == undefined) {
            error = new Error(`"null" or "undefined" thrown`);
        }
        const message = [
            types_1.ERROR,
            error.constructor && error.constructor.name,
            error.message,
            error.stack,
            error,
        ];
        ensuredSendToMain(message);
    }
    function onResult(result) {
        const message = [types_1.RESULT, result];
        ensuredSendToMain(message);
    }
    const MESSAGING_VERSION = 1;
    exports.getMessenger = getMessenger = function () {
        return {
            onMessage(listener) {
                listeners.push(listener);
            },
            sendMessage(message) {
                const poolMessage = [types_1.CUSTOM_MESSAGE, message];
                ensuredSendToMain(poolMessage);
            },
            messagingVersion: MESSAGING_VERSION,
        };
    };
    Promise.resolve().then(() => __importStar(require(process.env.GATSBY_WORKER_MODULE_PATH))).then((child) => {
        function messageHandler(message) {
            switch (message[0]) {
                case types_1.EXECUTE: {
                    let result;
                    try {
                        result = child[message[1]].call(child, ...message[2]);
                    }
                    catch (error) {
                        onError(error);
                        return;
                    }
                    if ((0, utils_1.isPromise)(result)) {
                        result.then(onResult, onError);
                    }
                    else {
                        onResult(result);
                    }
                    break;
                }
                case types_1.END: {
                    process.off(`message`, messageHandler);
                    break;
                }
                case types_1.CUSTOM_MESSAGE: {
                    for (const listener of listeners) {
                        listener(message[1]);
                    }
                    break;
                }
                // No default
            }
        }
        process.on(`message`, messageHandler);
    });
}
//# sourceMappingURL=child.js.map