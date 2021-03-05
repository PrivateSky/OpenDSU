const ObservableMixin  = require("../../utils/ObservableMixin");
const crypto = require("crypto");

// TODO: refactor into common place
function uid(bytes = 32) {
    // node
    if (process) {
        return crypto.randomBytes(bytes).toString('base64')
    }
    // browser
    else {
        if (!crypto || !crypto.getRandomValues) {
            throw new Error('crypto.getRandomValues not supported by the browser.')
        }

        return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(bytes))))
    }
}

function Record(data) {
    // this.filePath = "abc";
    this.change = data;
    this.__timestamp = Date.now();
    this.__id = uid();

}

function BasicDistributedDB(storageStrategy){
    let self = this;
    ObservableMixin(this);
    /*
        Get the whole content of the collection and asynchronously return an array with all the  records satisfying the condition tested by the filterFunction
     */
    this.filter = function(collectionName, filterFunction, callback){
        storageStrategy.filterCollection(collectionName, filterFunction, callback);
    };

    this.query = this.filter;

    function getDefaultCallback(message, collectionName, key){
        return function (err,res){
            if(err){
                console.log(message,err);
            }else {
                console.log(message,`in collection ${collectionName} for key ${key} at version ${res.__version}`);
            }

        }
    }

    /*
      Insert a record, return error if already exists
    */
    this.insert = function(collectionName, key, data, callback){
        callback = callback?callback:getDefaultCallback("Inserting a record", collectionName, key);
        const newRecord = new Record(data)
        return storageStrategy.insert(collectionName, key, newRecord, null, callback);
    };


    /*
        Update a record, does not return an error if does not exists
     */
    this.update = function(collectionName, key, data, oldRecord, callback){
        callback = callback?callback:getDefaultCallback("Updating a record", collectionName, key);
        let current
        const newRecord = new Record(data);

        return storageStrategy.update(collectionName, key, newRecord, oldRecord, callback);
    };

    /*
        Get a single row from a collection
     */
    this.get = function(collectionName, key, callback) {
        storageStrategy.get(collectionName, key, function(err,res){
            if(err || res.__deleted){
                return callback(createOpenDSUErrorWrapper(`Missing record in collection ${collectionName} and key ${key}`, err));
            }
            callback(undefined,res);
        });
    };

    /*
      Get the history of a record, including the deleted versions
   */
    this.getHistory = function(collectionName, key, callback){
        storageStrategy.get(collectionName, key, function(err,res){
            if(err){
                return callback( createOpenDSUErrorWrapper(`No history for collection ${collectionName} and key ${key}`, err));
            }
            callback(undefined, self.getVersions(res));
        });
    };

    /*
      Delete a record
     */
    this.delete = function(collectionName, key, callback){
        self.get(collectionName, key, function(err, record){
            record.__version++;
            record.__timestamp = Date.now();
            record.__deleted = true;
            storageStrategy.update(collectionName, key, record, callback);
        })
    };

    this.getVersions = function(record){
        let arrRes = []
        while(record){
            arrRes.unshift(record);
            record = record.__previous;
        }
        return arrRes;
    }
}

module.exports = BasicDistributedDB;