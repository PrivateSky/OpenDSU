const openDSU = require("opendsu");
const crypto = openDSU.loadApi("crypto");
const keySSISpace = openDSU.loadApi("keyssi");
const cachedStores = require("../cache/");
const storeName = "bricks";

function putBrick(brick, callback) {
    const cache = cachedStores.getCacheForVault(storeName);
    const hash = crypto.getCryptoFunctionForKeySSI(keySSISpace.createTemplateSeedSSI("vault"), "hash");
    const brickHash = hash(brick);

    cache.put(brickHash, brick, (err, hash) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to put brick data in cache`, err));
        }

        callback(undefined, hash);
    });
}

function getBrick(brickHash, callback) {
    const cache = cachedStores.getCacheForVault(storeName);
    cache.get(brickHash, (err, brickData) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get retrieve brick <${brickHash}> from cache`, err));
        }

        callback(undefined, brickData);
    });
}

function getMultipleBricks(brickHashes, callback) {
    // The bricks need to be returned in the same order they were requested
    let brickPromise = Promise.resolve();
    for (const hl of brickHashes) {
        // TODO: FIX ME
        // This is a HACK. It should cover 99% of the cases
        // but it might still fail if the brick data transfer
        // is delayed due to network issues and the next iteration
        // resolves faster. The correct solution involves changing
        // multiple layers
        brickPromise = brickPromise.then(() => {
            return new Promise((resolve) => {
                getBrick(hl, (err, brick) => {
                    callback(err, brick);
                    resolve();
                });
            })
        })
    }
}

module.exports = {
    putBrick,
    getBrick,
    getMultipleBricks
}
