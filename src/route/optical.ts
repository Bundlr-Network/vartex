import { Request, Response } from "express";
import { makeError } from "./utils";

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

    for (const msg of eventBody) {

        // assert(typeof msg.id === "string" && msg.id.length === 43);
        const alreadyExistsQuery = await pool.query(
            `SELECT id FROM transactions WHERE id = '${msg.id}';`
        );
        const alreadyExists = alreadyExistsQuery.rowCount > 0;

        if (alreadyExists) {
            console.error(`Attempting to update already existing tx ${msg.id}`);
            return makeError(response, 202);
        }

        const insertObj = formatDataItem(msg);

        const [txInserts, tagKVInserts] = buildInserts(msg.tags, insertObj);

        console.log("result", { txInserts, tagKVInserts });

        await pool.query({ text: txInserts.query, values: txInserts.values });

        for (const tagKV of tagKVInserts) {
            await pool.query({ text: tagKV[0], values: tagKV[1] });
        }

        await new Promise((resolve) => {
            docClient.put(
                {
                    TableName: "bundler-optical-data-items",
                    Item: { ...insertObj, publicKey },
                },
                function (err, data) {
                    if (err) {
                        console.log("DynamoDbError", err);
                    } else {
                        console.log("DynamoDbSuccess", data);
                    }
                    resolve();
                }
            );
        });
    }

    pool.end();

    return {
        statusCode: 200,
    };
}

function formatDataItem({
                            content_type = "",
                            data_size = 0,
                            id,
                            owner,
                            owner_address,
                            signature,
                            tags,
                            target = "",
                        }) {
    return {
        content_type,
        // parent: nullParent,
        format: 1,
        reward: 0,
        quantity: 0,
        id,
        signature,
        owner,
        owner_address,
        tags: JSON.stringify(tags || []),
        target,
        data_size,
    };
}