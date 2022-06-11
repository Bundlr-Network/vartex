"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyPostRoute = exports.proxyGetRoute = void 0;
const tslib_1 = require("tslib");
const node_1 = require("../query/node");
const got_1 = tslib_1.__importDefault(require("got"));
function proxyGetRoute(request, response) {
    const uri = `${(0, node_1.grabNode)()}${request.originalUrl}`;
    const stream = got_1.default.stream.get(uri);
    stream.on("error", (error) => {
        response.status(404).json({
            status: 404,
            error: "Not Found: " + error,
        });
        console.log(`[GET] Failed to get: ${uri}`);
    });
    stream.on("end", () => response.end());
    stream.pipe(response);
}
exports.proxyGetRoute = proxyGetRoute;
function proxyPostRoute(request, response) {
    const uri = `${(0, node_1.grabNode)()}${request.originalUrl}`;
    const stream = got_1.default.stream.post(uri, {
        body: JSON.stringify(request.body),
    });
    stream.on("error", (error) => {
        console.log(error);
        response.status(503).send();
        console.log(`[POST] Failed to post: ${uri}`);
    });
    stream.on("end", () => response.end());
    stream.pipe(response);
}
exports.proxyPostRoute = proxyPostRoute;
//# sourceMappingURL=proxy.js.map