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
    brickHashes.forEach(brickHash => {
        getBrick(brickHash, callback);
    });

}

module.exports = {
    putBrick,
    getBrick,
    getMultipleBricks
}