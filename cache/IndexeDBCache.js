let stores = {};
const config = require("opendsu").loadApi("config");
const CacheMixin = require("../utils/PendingCallMixin");
const constants = require("../moduleConstants");

function IndexedDBCache(storeName, lifetime) {
    const self = this;
    CacheMixin(self);

    let db;
    let openRequest = indexedDB.open(storeName);
    openRequest.onsuccess = () => {
        db = openRequest.result;
        self.executePendingCalls();
        self.executeSerialPendingCalls();
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
            let transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            let req = store.get(key);
            transaction.oncomplete = () => {
                if (typeof lifetime !== "undefined") {
                    const currentTime = Date.now();
                    const timestampedData = req.result;
                    if (typeof timestampedData === "undefined") {
                        return callback();
                    }
                    if (currentTime - timestampedData.timestamp > lifetime) {
                        self.delete(key);
                        return callback();
                    }
                    callback(undefined, timestampedData.value)
                } else {
                    callback(undefined, req.result);
                }
            }
        }
    };

    self.put = (key, value, callback) => {
        self.addSerialPendingCall((next) => {
            let transaction;
            let store
            try {
                transaction = db.transaction(storeName, "readwrite");
                store = transaction.objectStore(storeName);
            }catch (e) {
                callback(e);
                return next();
            }
            let data;
            if (typeof lifetime !== "undefined") {
                data = {
                    value: value,
                    timestamp: Date.now()
                }
            } else {
                data = value;
            }
            let req = store.put(data, key);
            transaction.oncomplete = () => {
                if (typeof callback === "function") {
                    callback(undefined, key);
                }
                next();
            }
            transaction.onabort = function() {
                console.log("Error", transaction.error);
            };
            req.onerror = function (event){
                next();
            }
        });
    };


    self.set = self.put;

    self.delete = (key, callback) => {
            self.addSerialPendingCall((next) => {
                let transaction;
                let store;
                try {
                    transaction = db.transaction(storeName, "readwrite");
                    store = transaction.objectStore(storeName);
                }catch (e) {
                    callback(e);
                    next();
                    return;
                }
                let req = store.delete(key);
                transaction.oncomplete = () => {
                    if (typeof callback === "function") {
                        callback(undefined, key);
                    }
                    next();
                }
                transaction.onabort = function() {
                    console.log("Error", transaction.error);
                };
                req.onerror = function (event){
                    next();
                }
            });
    }
}


module.exports.IndexedDBCache  = IndexedDBCache;