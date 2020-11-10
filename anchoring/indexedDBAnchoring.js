const openDSU = require("opendsu");
const keySSISpace = openDSU.loadApi("keyssi");
const cachedIndexDBStores = require("../utils/cachedIndexedDBStores");
const storeName = "anchors";

function addVersion(anchorId, newHashLinkId, callback) {
    const dbHandler = cachedIndexDBStores.getDBHandler(storeName);
    dbHandler.get(anchorId, (err, hashLinkIds) => {
        if (err) {
            return callback(err);
        }

        if (typeof hashLinkIds === "undefined") {
            hashLinkIds = [];
        }

        hashLinkIds.push(newHashLinkId);
        dbHandler.put(anchorId, hashLinkIds, callback);
    });
}

function versions(anchorId, callback) {
    const dbHandler = cachedIndexDBStores.getDBHandler(storeName);
    dbHandler.get(anchorId, (err, hashLinkIds) => {
        if (err) {
            return callback(err);
        }

        if (typeof hashLinkIds === "undefined") {
            hashLinkIds = [];
        }
        const hashLinkSSIs = hashLinkIds.map(hashLinkId => keySSISpace.parse(hashLinkId));
        return callback(undefined, hashLinkSSIs);
    });
}

module.exports = {
    addVersion,
    versions
}