const openDSU = require("opendsu");
const crypto = openDSU.loadApi("crypto");
const keySSISpace = openDSU.loadApi("keyssi");
const cachedIndexDBStores = require("../utils/cachedIndexedDBStores");
const storeName = "bricks";

function putBrick(brick, callback) {
    const dbHandler = cachedIndexDBStores.getDBHandler(storeName);
    crypto.hash(keySSISpace.buildSeedSSI("vault"), brick, (err, brickHash) => {
        if (err) {
            return callback(err);
        }

        dbHandler.put(brickHash, brick, (err, hash) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, hash);
        });
    });
}

function getBrick(brickHash, callback) {
    const dbHandler = cachedIndexDBStores.getDBHandler(storeName);
    dbHandler.get(brickHash, (err, brickData) => {
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