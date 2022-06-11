"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importManifest = exports.importManifests = void 0;
const tslib_1 = require("tslib");
const R = tslib_1.__importStar(require("rambda"));
const cassandra_driver_1 = require("cassandra-driver");
const mime_types_1 = require("mime-types");
const constants_1 = require("../constants");
const child_1 = require("../gatsby-worker/child");
const log_1 = require("../utility/log");
const encoding_1 = require("../utility/encoding");
const transaction_1 = require("../query/transaction");
const node_1 = require("../query/node");
const mapper_1 = require("../database/mapper");
const manifest_1 = require("../utility/manifest");
let messenger = (0, child_1.getMessenger)();
if (messenger) {
    messenger.sendMessage({
        type: "worker:ready",
    });
}
else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messenger = { sendMessage: console.log };
}
const log = (0, log_1.mkWorkerLog)(messenger);
function importManifests() {
    var e_1, _a;
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        log("doing manifest import");
        const unimportedManifests = yield mapper_1.cassandraClient.execute(`SELECT * FROM ${constants_1.KEYSPACE}.manifest_queue`, [], { prepare: true });
        try {
            for (var unimportedManifests_1 = tslib_1.__asyncValues(unimportedManifests), unimportedManifests_1_1; unimportedManifests_1_1 = yield unimportedManifests_1.next(), !unimportedManifests_1_1.done;) {
                const unimportedManifest = unimportedManifests_1_1.value;
                log(`importing manifest ${unimportedManifest.tx_id}`);
                if (!(yield importManifest(unimportedManifest.tx_id))) {
                    const numberRetries = 10000;
                    if ((unimportedManifest.import_attempt_cnt || 0) < numberRetries) {
                        log(`failed to fetch chunked data for ${unimportedManifest.tx_id} will try again later...`);
                        yield mapper_1.manifestQueueMapper.update({
                            tx_id: unimportedManifest.tx_id,
                            import_attempt_cnt: (unimportedManifest.import_attempt_cnt || 0) + 1,
                        });
                    }
                    else {
                        log(`failed to fetch chunked data for ${unimportedManifest.tx_id} and I will not attempt to do so again now that this failed ${numberRetries} times!`);
                        yield mapper_1.manifestQueueMapper.remove({
                            tx_id: unimportedManifest.tx_id,
                        });
                    }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (unimportedManifests_1_1 && !unimportedManifests_1_1.done && (_a = unimportedManifests_1.return)) yield _a.call(unimportedManifests_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    });
}
exports.importManifests = importManifests;
// returns true if successfull
function importManifest(txId) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let manifest;
        try {
            let buffer;
            const offsetData = yield (0, transaction_1.getTxOffset)({ txId });
            if (offsetData) {
                const offset = cassandra_driver_1.types.Long.fromString(offsetData.offset);
                buffer = yield (0, node_1.getDataFromChunks)({
                    startOffset: offset
                        .subtract(cassandra_driver_1.types.Long.fromString(offsetData.size))
                        .add(1),
                    endOffset: offset,
                });
            }
            if (buffer) {
                const unparsed = buffer.toString("utf8");
                manifest = JSON.parse(unparsed);
            }
        }
        catch (error) {
            messenger.sendMessage({
                type: "log:warn",
                message: "error while downloading manifest from chunks",
                payload: error,
            });
        }
        if (manifest) {
            // validate
            const validResult = manifest_1.ManifestV010.safeParse(manifest);
            if (validResult.success &&
                validResult.data.manifest === "arweave/paths" &&
                ["0.0.0", "0.1.0"].includes(validResult.data.version)) {
                const manifestIndex = R.pathOr("", "index.path", validResult.data);
                let manifestIndexMatched = false;
                for (const pathUnescaped of Object.keys(validResult.data.paths)) {
                    const { id: pathId, ext } = validResult.data.paths[pathUnescaped];
                    const tx = pathId.length === 43
                        ? yield mapper_1.transactionMapper.get({ tx_id: pathId })
                        : undefined;
                    if (tx) {
                        let contentType;
                        const safePath = escape(pathUnescaped.toLowerCase());
                        if (ext) {
                            contentType = (0, mime_types_1.lookup)(ext) || undefined;
                        }
                        if (!contentType && Array.isArray(tx.tags) && tx.tags.length > 0) {
                            const tags = tx.tags.map(encoding_1.utf8DecodeTupleTag);
                            for (const tag of tags) {
                                if (tag.name.toLowerCase() === "content-type") {
                                    contentType = tag.value;
                                }
                            }
                        }
                        if (!contentType) {
                            contentType =
                                (0, mime_types_1.lookup)(pathUnescaped) || "application/octet-stream";
                        }
                        if (!manifestIndexMatched && manifestIndex === pathUnescaped) {
                            manifestIndexMatched = true;
                            mapper_1.permawebPathMapper.insert({
                                domain_id: txId,
                                target_id: tx.tx_id,
                                uri_path: "",
                                content_length: tx.data_size.toString(),
                                content_type: contentType,
                                blacklisted: false,
                                customElements: [], // maybe later?
                            });
                        }
                        mapper_1.permawebPathMapper.insert({
                            domain_id: txId,
                            target_id: tx.tx_id,
                            uri_path: safePath,
                            content_length: tx.data_size.toString(),
                            content_type: contentType,
                            blacklisted: false,
                            customElements: [], // maybe later?
                        });
                    }
                }
                yield mapper_1.manifestMapper.insert({
                    tx_id: txId,
                    manifest_type: validResult.data.manifest,
                    manifest_version: validResult.data.version,
                    manifest_index: manifestIndex,
                    manifest_paths: JSON.stringify(validResult.data.paths),
                });
                try {
                    if (yield mapper_1.manifestQueueMapper.get({
                        tx_id: txId,
                    })) {
                        yield mapper_1.manifestQueueMapper.remove({
                            tx_id: txId,
                        });
                    }
                    log(`successfully imported manifest ${txId}`);
                }
                catch (error) {
                    messenger.sendMessage({
                        type: "log:warn",
                        message: "error while removing unimported manifest from queue",
                        payload: error,
                    });
                }
                return true;
            }
            else {
                messenger.sendMessage({
                    type: "log:warn",
                    message: `Invalid manifest detected ${txId} `,
                });
                yield mapper_1.manifestMapper.insert({
                    tx_id: txId,
                    manifest_type: "error",
                });
                try {
                    yield mapper_1.manifestQueueMapper.remove({
                        tx_id: txId,
                    });
                }
                catch (error) {
                    messenger.sendMessage({
                        type: "log:warn",
                        message: "error while removing unimported manifest from queue (2)",
                        payload: error,
                    });
                }
                return true;
            }
        }
        else {
            return false;
        }
    });
}
exports.importManifest = importManifest;
// importManifests().then(() => process.exit(0));
//# sourceMappingURL=import-manifest.js.map