const openDSU = require("opendsu");
const keySSISpace = openDSU.loadApi("keyssi");
const cachedStores = require("../cache/cachedStores");
const storeName = "anchors";

function addVersion(anchorId, newHashLinkId, callback) {
    const cache = cachedStores.getCache(storeName);
    cache.get(anchorId, (err, hashLinkIds) => {
        if (err) {
            return callback(createOpenDSUErrorWrapper(`Failed to get anchor <${anchorId}> from cache`, err));
        }

        if (typeof hashLinkIds === "undefined") {
            hashLinkIds = [];
        }

        hashLinkIds.push(newHashLinkId);
        cache.put(anchorId, hashLinkIds, callback);
    });
}

function versions(anchorId, callback) {
    const cache = cachedStores.getCache(storeName);
    cache.get(anchorId, (err, hashLinkIds) => {
        if (err) {
            return callback(createOpenDSUErrorWrapper(`Failed to get anchor <${anchorId}> from cache`, err));
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