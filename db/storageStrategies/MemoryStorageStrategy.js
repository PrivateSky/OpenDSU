function MemoryStorageStrategy(){
    const ObservableMixin = require("../../utils/ObservableMixin");
    const operators = require("./operators");
    let volatileMemory = {}
    let self = this
    let storageDSU, afterInitialisation;
    let dbName;

    ObservableMixin(this);
    function getTable(tableName){
        let table = volatileMemory[tableName];
        if(!table){
            table = volatileMemory[tableName] = {};
        }
        return table;
    }

    /*
       Get the whole content of the table and asynchronously returns an array with all the  records satisfying the condition tested by the filterFunction
    */
    this.filterTable = function(tableName, filterFunction, callback){
        let tbl = getTable(tableName);
        let result = [];
        for(let n in tbl){
            let item = tbl[n];
            if(filterFunction(item)){
                item.__key = n;
                result.push(item);
            }
        }
        callback(undefined,result);
    };

    this.filter = function (tableName, conditionsArray, sort, limit, callback) {
        if (typeof conditionsArray === "function") {
            callback = conditionsArray;
            conditionsArray = undefined;
            sort = undefined;
            limit = undefined;
        }

        if (typeof conditionsArray === "undefined") {
            conditionsArray = "__timestamp > 0";
        }

        if (typeof conditionsArray === "string") {
            conditionsArray = [conditionsArray];
        } else if (!Array.isArray(conditionsArray)) {
            return callback(Error(`Condition argument of filter function need to be string or array of strings`));
        }

        if (typeof sort === "function") {
            callback = sort;
            sort = undefined;
            limit = undefined;
        }

        if (typeof limit === "function") {
            callback = limit;
            limit = undefined;
        }

        if (typeof limit === "undefined") {
            limit = Infinity;
        }

        if (typeof sort === "undefined") {
            sort = "asc";
        }

        const tbl = getTable(tableName);
        const records = Object.values(tbl);
        const filteredRecords = [];
        let Query = require("./Query");
        let query = new Query(conditionsArray);
        const conditions = query.getConditions();
        records.forEach(record => {
            let shouldBeAdded = true;
            for (let i = 0; i < conditions.length; i++) {
                if (!operators[conditions[i][1]](record[conditions[i][0]], conditions[i][2])) {
                    shouldBeAdded = false;
                }
            }
            if (shouldBeAdded && filteredRecords.length < limit) {
                filteredRecords.push(record);
            }
        })
        query.sortValues(filteredRecords, sort);
        callback(undefined, filteredRecords);
    }
    /*
      Insert a record, return error if already exists
    */
    this.insertRecord = function(tableName, key, record, callback, reInsert = false){
        let currentParent = getTable(tableName)

        function _insertRecord(currentParent, currentKey) {
            if (!reInsert && currentParent[currentKey] != undefined) {
                return callback(new Error("Can't insert a new record for currentKey " + currentKey))
            }

            currentParent[currentKey] = record;
            callback(undefined, record);
        }

        if (typeof key === 'string') {
            _insertRecord(currentParent, key)
        }
        else {
            let currentKey = key[0];
            for (let i = 1; i <= key.length; i++) {
                if (currentParent[currentKey] == undefined){
                    currentParent[currentKey] = i === key.length ? undefined : {}
                }

                if (i === key.length) {
                    break
                }
                else {
                    currentParent = currentParent[currentKey]
                    currentKey = key[i];
                }
            }

            _insertRecord(currentParent, currentKey)
        }
    };

    /*
        Update a record, return error if does not exists
     */
    this.updateRecord = function(tableName, key, record, currentRecord, callback){
        function _updateRecord(record, previousRecord, callback) {
            if (!previousRecord) {
                return callback(new Error("Can't update a record for key " + key))
            }

            record.__previousRecord = previousRecord;
            self.insertRecord(tableName, key, record, callback, true);
        }

        if (typeof currentRecord === 'function') {
            callback = currentRecord

            this.getRecord(tableName, key, (err, previousRecord) => {
                if (err) {
                    return callback(err)
                }
                _updateRecord(record, previousRecord, callback)
            })
        }
        else {
            _updateRecord(record, currentRecord, callback)
        }
    };

    /*
        Get a single row from a table
     */
    this.getRecord = function(tableName, key, callback){
        let tbl = getTable(tableName);
        let record;
        if (typeof key === 'string') {
            record = tbl[key];
            if( record == undefined){
                return callback(new Error("Can't retrieve a record for key " + key))
            }
            callback(undefined, record);
        }
        else {
            record = tbl[key[0]]
            for (let i = 1; i <= key.length; i++) {
                if (record == undefined){
                    return callback(new Error("Can't retrieve a record for key " + key.concat(".")))
                }

                if (i === key.length) {
                    break
                }
                else {
                    record = record[key[i]];
                }
            }

            callback(undefined, record);
        }
    };

    this.beginBatch = () => {

    }

    this.commitBatch = (callback) => {
        callback(undefined);
    }

    this.cancelBatch = (callback) => {
        callback(undefined);
    }

    const READ_WRITE_KEY_TABLE = "KeyValueTable";
    this.writeKey =  (key, value, callback) => {
        let valueObject = {
            type: typeof value,
            value: value
        };

        if (typeof value === "object") {
            if (Buffer.isBuffer(value)) {
                valueObject = {
                    type: "buffer",
                    value: value.toString()
                }
            } else {
                valueObject = {
                    type: "object",
                    value: JSON.stringify(value)
                }
            }
        }

        this.insertRecord(READ_WRITE_KEY_TABLE, key, valueObject, callback);
    };

    this.readKey =  (key, callback) => {
        this.getRecord(READ_WRITE_KEY_TABLE, key, (err, record) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read key ${key}`, err));
            }

            let value;
            switch (record.type) {
                case "buffer":
                    value = Buffer.from(record.value);
                    break;
                case "object":
                    value = JSON.parse(record.value);
                    break;
                default:
                    value = record.value;
            }

            callback(undefined, value);
        });
    }

    setTimeout(()=>{
        this.dispatchEvent("initialised");
    })
}

module.exports = MemoryStorageStrategy;