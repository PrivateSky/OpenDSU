let stores = {};
const config = require("opendsu").loadApi("config");
const CacheMixin = require("./CacheMixin");
const constants = require("../moduleConstants");

function IndexedDBCache(storeName) {
    const self = this;
    CacheMixin(self);

    let db;
    let openRequest = indexedDB.open(storeName);
    openRequest.onsuccess = () => {
        db = openRequest.result;
        self.executePendingCalls();
    };

    openRequest.onupgradeneeded = () => {
        db = openRequest.result;
        db.createObjectStore(storeName);
    };

    self.get = (key, callback) => {
        if (typeof db === "undefined") {
            self.addPendingCall(() => {
                self.get(key, callback);
            });
        } else {
            let transaction = db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            let req = store.get(key);
            req.onsuccess = function () {
                callback(undefined, req.result);
            }
        }
    };

    self.put = (key, value, callback) => {
        if (typeof db === "undefined") {
            self.addPendingCall(() => {
                self.put(key, value, callback);
            });
        } else {
            let transaction = db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            let req = store.put(value, key);
            req.onsuccess = function () {
                callback(undefined, key);
            }
        }
    };
}

function FSCache(folderName) {
    const self = this;
    CacheMixin(self);
    const fsName = "fs";
    const fs = require(fsName);
    let baseFolder = config.get(constants.CACHE.BASE_FOLDER_CONFIG_PROPERTY);
    if (typeof baseFolder === "undefined") {
        baseFolder = process.cwd();
    }
    const path = require("swarmutils").path;
    const folderPath = path.join(baseFolder, folderName);
    let storageFolderIsCreated = false;
    fs.mkdir(folderPath, {recursive: true}, (err) => {
        if (err) {
            throw err;
        }

        storageFolderIsCreated = true;
    });

    self.get = function (key, callback) {
        if (!storageFolderIsCreated) {
            self.addPendingCall(() => {
                self.get(key, callback);
            })
        } else {
            fs.readFile(path.join(folderPath, key), (err, data) => {
                if (err) {
                    return callback(err);
                }

                callback(undefined, data.toString());
            });
        }
    };

    self.put = function (key, value, callback) {
        if (!storageFolderIsCreated) {
            self.addPendingCall(() => {
                self.put(key, value, callback);
            })
        } else {
            fs.writeFile(path.join(folderPath, key), value, callback);
        }
    }
}

function getCache(storeName) {
    if (typeof stores[storeName] === "undefined") {
        switch (config.get(constants.CACHE.VAULT_TYPE)) {
            case constants.CACHE.INDEXED_DB:
                stores[storeName] = new IndexedDBCache(storeName);
                break;
            case constants.CACHE.FS:
                stores[storeName] = new FSCache(storeName);
                break;
            default:
                throw Error("Invalid cache type");
        }
    }

    return stores[storeName];
}


module.exports = {
    getCache
}