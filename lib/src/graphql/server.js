"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphServer = void 0;
const node_fs_1 = require("node:fs");
const apollo_server_core_1 = require("apollo-server-core");
const apollo_server_express_1 = require("apollo-server-express");
const resolver_1 = require("./resolver");
const typeDefs = (0, apollo_server_express_1.gql)((0, node_fs_1.readFileSync)(`${process.cwd()}/types.graphql`, "utf8"));
function graphServer(options = {}) {
    const graphServer = new apollo_server_express_1.ApolloServer(Object.assign({ typeDefs,
        resolvers: resolver_1.resolvers, debug: false, plugins: [(0, apollo_server_core_1.ApolloServerPluginLandingPageDisabled)()], context: (context) => {
            return {
                req: context.req,
                conection: {},
                tracing: false,
                // connection,
            };
        } }, options));
    return graphServer;
}
exports.graphServer = graphServer;
//# sourceMappingURL=server.js.map