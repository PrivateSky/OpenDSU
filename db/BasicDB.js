/*
    An OpenDSU  BasicDB is a simple noSQL database
    The DB is used with a concept of "table" and rows (records) that have multiple versions
    The support for multiple versions is offered by getVersions function and by automatically managing 2 fields in the records:
         - the "__version" field representing the height of the graph
         - the "__previousRecord" field pointing to the previous version of the record
         - the "__changeId" is unique id, is used to quickly determine the unique id of parent node/s for future conflict solving
         - the "__timestamp" is a timestamp, number of milliseconds elapsed since January 1, 1970 00:00:00 UTC.

    As you can see, nothing is ever really updated, even the deletion is done by marking the record with the field "deleted"
 */

const ObservableMixin  = require("../utils/ObservableMixin");
const {uid} = require("./utils")


function BasicDB(storageStrategy){
    let self = this;
    ObservableMixin(this);
    /*
        Get the whole content of the table and asynchronously return an array with all the  records satisfying the condition tested by the filterFunction
     */
    this.filter = function(tableName, filterFunction, callback){
        storageStrategy.filterTable(tableName, filterFunction, callback);
    };

    this.query = this.filter;

    function getDefaultCallback(message, tableName, key){
        return function (err,res){
            if(err){
                console.log(message,err);
            }else {
                console.log(message,`in table ${tableName} for key ${key} at version ${res.__version}`);
            }

        }
    }

    /*
      Insert a record, return error if already exists
    */
    this.insertRecord = function(tableName, key, record, callback){
        callback = callback?callback:getDefaultCallback("Inserting a record", tableName, key);
        const sharedDSUMetadata = {}
        sharedDSUMetadata.__version = 0;
        sharedDSUMetadata.__changeId = uid();
        sharedDSUMetadata.__timestamp = Date.now();
        storageStrategy.insertRecord(tableName, key, Object.assign(sharedDSUMetadata, record), callback);
    };


    /*
        Update a record, does not return an error if does not exists
     */
    this.updateRecord = function(tableName, key, newRecord, callback){
        callback = callback?callback:getDefaultCallback("Updating a record", tableName, key);
        let currentRecord

        function doVersionIncAndUpsert(currentRecord){
            newRecord.__version++;
            newRecord.__timestamp = Date.now();
            newRecord.__changeId = uid();

            if (newRecord.__version == 0) {
                storageStrategy.insertRecord(tableName, key, newRecord, callback);
            } else {
                storageStrategy.updateRecord(tableName, key, newRecord, currentRecord, callback);
            }
        }

        if (newRecord.__version === undefined) {
            self.getRecord(tableName, key, function(err,res){
                if(err || !res){
                    newRecord = Object.assign(newRecord, {__version:-1});
                }
                if (res) {
                    currentRecord = res;
                    newRecord.__version = currentRecord.__version;
                }
                doVersionIncAndUpsert(currentRecord);
            });
        } else {
            doVersionIncAndUpsert()
        }
    };

    /*
        Get a single row from a table
     */
    this.getRecord = function(tableName, key, callback) {
        storageStrategy.getRecord(tableName, key, function(err,res){
            if(err || res.__deleted){
                return callback(createOpenDSUErrorWrapper(`Missing record in table ${tableName} and key ${key}`, err));
            }
            callback(undefined,res);
        });
    };

    /*
      Get the history of a record, including the deleted versions
   */
    this.getHistory = function(tableName, key, callback){
        storageStrategy.getRecord(tableName, key, function(err,res){
            if(err){
                return callback( createOpenDSUErrorWrapper(`No history for table ${tableName} and key ${key}`, err));
            }
            callback(undefined, self.getRecordVersions(res));
        });
    };

    /*
      Delete a record
     */
    this.deleteRecord = function(tableName, key, callback){
        self.getRecord(tableName, key, function(err, record){
            record.__version++;
            record.__timestamp = Date.now();
            record.__deleted = true;
            storageStrategy.updateRecord(tableName, key, record, callback);
        })
    };

    this.getRecordVersions = function(record){
        let arrRes = []
        while(record){
            arrRes.unshift(record);
            record = record.__previousRecord;
        }
        return arrRes;
    }
}

module.exports = BasicDB;
