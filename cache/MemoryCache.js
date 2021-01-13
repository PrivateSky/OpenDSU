
const constants = require("../moduleConstants");

function MemoryCache() {
    let storage = {};
    const self = this;

    self.get = function (key, callback) {
        if(typeof key !== "string"){
            throw new Error("Keys should be strings");
        }
        if(callback){
            callback(undefined, storage[key])
        }
        return storage[key];
    };

    self.put = function (key, value, callback) {
        if(typeof key !== "string"){
            throw new Error("Keys should be strings");
        }
        storage[key] = value;
        if(callback){
            callback(undefined, true)
        }
    }

    self.set = self.put;
}


module.exports.MemoryCache = MemoryCache;