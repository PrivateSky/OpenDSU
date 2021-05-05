const openDSU = require("opendsu");
const keySSISpace = openDSU.loadApi("keyssi");
const cachedStores = require("../cache/");
const storeName = "anchors";

function addVersion(anchorId, newHashLinkId, callback) {
    const cache = cachedStores.getCacheForVault(storeName);
    cache.get(anchorId, (err, hashLinkIds) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get anchor <${anchorId}> from cache`, err));
        }

        if (typeof hashLinkIds === "undefined") {
            hashLinkIds = [];
        }

        // when the anchor is first created, no version is created yet
        if(newHashLinkId) {
            hashLinkIds.push(newHashLinkId);
        }
        cache.put(anchorId, hashLinkIds, callback);
    });
}

function versions(anchorId, callback) {
    const cache = cachedStores.getCacheForVault(storeName);
    cache.get(anchorId, (err, hashLinkIds) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get anchor <${anchorId}> from cache`, err));
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