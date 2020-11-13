const openDSU = require("opendsu");
const crypto = openDSU.loadApi("crypto");
const keySSISpace = openDSU.loadApi("keyssi");
const cachedStores = require("../cache/cachedStores");
const storeName = "bricks";

function putBrick(brick, callback) {
    const cache = cachedStores.getCache(storeName);
    crypto.hash(keySSISpace.buildSeedSSI("vault"), brick, (err, brickHash) => {
        if (err) {
            return callback(err);
        }

        cache.put(brickHash, brick, (err, hash) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, hash);
        });
    });
}

function getBrick(brickHash, callback) {
    const cache = cachedStores.getCache(storeName);
    cache.get(brickHash, (err, brickData) => {
        if (err) {
            return callback(err);
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