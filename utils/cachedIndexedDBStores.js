let stores = {};

function DBHandler(storeName) {
    let pendingCalls = [];
    let db;
    let openRequest = indexedDB.open(storeName);
    openRequest.onsuccess = () => {
        db = openRequest.result;
        pendingCalls.forEach(fn => fn());
        pendingCalls = [];
    };

    openRequest.onupgradeneeded = () => {
        db = openRequest.result;
        db.createObjectStore(storeName);
    };

    this.get = (key, callback) => {
        if (typeof db === "undefined") {
            pendingCalls.push(() => {
                this.get(key, callback);
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

    this.put = (key, value, callback) => {
        if (typeof db === "undefined") {
            pendingCalls.push(() => {
                this.put(key, value, callback);
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

function getDBHandler(storeName) {
    if (typeof stores[storeName] === "undefined") {
        stores[storeName] = new DBHandler(storeName);
    }

    return stores[storeName];
}


module.exports = {
    getDBHandler
}