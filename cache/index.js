let stores = {};
const config = require("opendsu").loadApi("config");
const CacheMixin = require("../utils/PendingCallMixin");
const constants = require("../moduleConstants");

const IndexedDBCache = require("./IndexeDBCache").IndexedDBCache;
const FSCache        = require("./FSCache").FSCache;
const MemoryCache    = require("./MemoryCache").MemoryCache;

function getCacheForVault(storeName, lifetime) {
    if (typeof stores[storeName] === "undefined") {
        switch (config.get(constants.CACHE.VAULT_TYPE)) {
            case constants.CACHE.INDEXED_DB:
                stores[storeName] = new IndexedDBCache(storeName, lifetime);
                break;
            case constants.CACHE.FS:
                stores[storeName] = new FSCache(storeName, lifetime);
                break;
            case constants.CACHE.MEMORY:
                stores[storeName] = new MemoryCache(storeName, lifetime);
                break;
            case constants.CACHE.NO_CACHE:
                break;
            default:
                throw Error("Invalid cache type");
        }
    }

    return stores[storeName];
}

function getMemoryCache(storeName){
    return stores[storeName] = new MemoryCache(storeName);
}

module.exports = {
    getCacheForVault,
    getMemoryCache
}