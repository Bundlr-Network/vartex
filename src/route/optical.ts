import { Request, Response } from "express";
import { makeError } from "./utils";
import { insertGqlTag, insertTx } from "../database/utils";
import { toLong } from "../database/cassandra";
import { types } from "cassandra-driver";
import Tuple = types.Tuple;
import { Tag } from "../types/arweave";

const pks = new Set([
    "sq9JbppKLlAKtQwalfX5DagnGMlTirditXk7y4jgoeA7DEM0Z6cVPE5xMQ9kz_T9VppP6BFHtHyZCZODercEVWipzkr36tfQkR5EDGUQyLivdxUzbWgVkzw7D27PJEa4cd1Uy6r18rYLqERgbRvAZph5YJZmpSJk7r3MwnQquuktjvSpfCLFwSxP1w879-ss_JalM9ICzRi38henONio8gll6GV9-omrWwRMZer_15bspCK5txCwpY137nfKwKD5YBAuzxxcj424M7zlSHlsafBwaRwFbf8gHtW03iJER4lR4GxeY0WvnYaB3KDISHQp53a9nlbmiWO5WcHHYsR83OT2eJ0Pl3RWA-_imk_SNwGQTCjmA6tf_UVwL8HzYS2iyuu85b7iYK9ZQoh8nqbNC6qibICE4h9Fe3bN7AgitIe9XzCTOXDfMr4ahjC8kkqJ1z4zNAI6-Leei_Mgd8JtZh2vqFNZhXK0lSadFl_9Oh3AET7tUds2E7s-6zpRPd9oBZu6-kNuHDRJ6TQhZSwJ9ZO5HYsccb_G_1so72aXJymR9ggJgWr4J3bawAYYnqmvmzGklYOlE_5HVnMxf-UxpT7ztdsHbc9QEH6W2bzwxbpjTczEZs3JCCB3c-NewNHsj9PYM3b5tTlTNP9kNAwPZHWpt11t79LuNkNGt9LfOek",
    "pGFsvdSB9sxbwU5L4HD2v12DK40kzZ5N69s6WlI3Uw9pFdHMHei3n1Tv4jvZqU9yeIMGsS60MQRvfJK1AEoNYsQqk4Rciajw0_IemZdwlt4u4voDALRalrQ3NV4knOlHRY11anqV0fNhikWCsiRPukIRZrdcFfqzFr0boH8bou7DgESNvWxROOxSC149oKxJ06FQsBDaIeElBsR8qTddybvXqMagXCM9y_HNrtAoz_8LgPjQtK5LFEbXhh9PyI_GOuoHyzJUc9Sm-V9kCB4kTm-SHrPbETQnvejZBcqEHxNcDNWBv6CWjj3-0V3dFMhjM1cy14d0Lm4j0IyRLm9bHM3s0ssVDd20gjWyar-D0o6guJIrteEC7UGR-w1yvXoGuIwdfZeoSAZ_CU9FrOJfQCTDs2aLgdCNeYKXg0Rt8YZL_elZnG7utCkO78TwxbGqear_I-1dlO39CUlo13YSS6pPonioWqkzXcXh93G7BYjgUxcPJ31kLyr2wBRA4OObAYRvh-5V3TkULlmwR4Q0pV3cUeOLI94b4WhaDZDI_RIJiCXQvtGy190NqTBeVogPrrAXLFkK0E013GByHrmzZoELfSUorjK-bDk4wXxdbVqzY7KXP-NEt3Bu-woinbUf56i3DXLrYlwINYK39VUydGpcQLZ5EDCL4u_IL_iFPt0",
]);

export async function optical(request: Request, response: Response): Promise<void> {
    const publicKey =
        request.headers["X-Bundlr-Public-Key"] ||
        request.headers["x-bundlr-public-key"];
    if (!pks.has(publicKey as string)) return makeError(response, 400);

    let eventBody;
    try {
        eventBody = JSON.parse(request.body);
    } catch {
        console.log("DEBUG", "Can't parse JSON");
        return makeError(response, 400);
    }

    if (!Array.isArray(eventBody)) {
        console.log("DEBUG", "Not an array :(");
        return makeError(response, 400);
    }

    console.log("DEBUG", { publicKey, eventBody });
    console.log("VERBOSE", response);

    // if (!(await verify(eventBody, publicKey))) return { statusCode: 400 };

    // let rdsProxySecret = { username: "", password: "" };

    // try {
    //     rdsProxySecret = JSON.parse(await getSecretValue("postgres-prod"));
    // } catch (error) {
    //     console.error(error);
    // }

    // const pool = new Pool({
    //     user: rdsProxySecret.username,
    //     host,
    //     database: "arweave",
    //     password: rdsProxySecret.password,
    //     port: 5432,
    // });

    const minusOne = toLong(-1);
    for (const tx of eventBody) {
        try {
            await insertGqlTag({
                data_root: null,
                data_size: tx.data_size,
                data_tree: null,
                format: null,
                id: tx.id,
                last_tx: null,
                owner: tx.owner,
                quantity: null,
                reward: null,
                signature: tx.signature,
                tags: tx.tags,
                target: tx.target,
                tx_id: tx.id,
                tx_index: minusOne
            });


            await insertTx({
                block_hash: null,
                block_height: minusOne,
                bundled_in: null,
                data_root: null,
                data_size: toLong(tx.data_size),
                data_tree: [],
                format: null,
                last_tx: null,
                owner: tx.owner,
                owner_address: tx.owner_address,
                quantity: null,
                reward: null,
                signature: tx.signature,
                tag_count: tx.tags.length,
                tags: tx.tags.map((t: Tag) => Tuple.fromArray([t.name, t.value])),
                target: tx.target,
                tx_id: tx.id,
                tx_index: minusOne,
                data_item_index: minusOne
            }, {
                transactionMapper: [
                    "block_height",
                    "data_size",
                    "tx_id",
                    "owner",
                    "owner_address",
                    "signature",
                    "tags",
                    "tag_count",
                    "target",
                ]
            });
        } catch (error) {
            console.error(`Error occurred while adding optical Bundlr tx - ${error}`);
            return makeError(response, 500);
        }

    }


    response.sendStatus(200).end();
}