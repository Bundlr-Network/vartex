"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashListRoute = void 0;
const tslib_1 = require("tslib");
const constants_js_1 = require("../constants.js");
const cassandra_js_1 = require("../database/cassandra.js");
function hashListRoute(request, response, next) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        response.writeHead(200, {
            "Content-Type": "application/json",
            "Transfer-Encoding": "chunked",
        });
        response.write("[");
        const stream = cassandra_js_1.cassandraClient.stream(`SELECT indep_hash FROM ${constants_js_1.KEYSPACE}.block`);
        stream.on("end", function streamEnd() {
            response.write("]");
            response.end();
        });
        stream.on("readable", function streamReadable() {
            let item;
            let head = true;
            while ((item = stream.read())) {
                response.write((!head ? "," : "") + JSON.stringify(item.indep_hash));
                head = false;
            }
        });
        stream.on("error", next);
    });
}
exports.hashListRoute = hashListRoute;
//# sourceMappingURL=hash-list.js.map