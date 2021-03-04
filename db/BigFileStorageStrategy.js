
function BigFileStorageStrategy(loadFunction, storeFunction, afterInitialisation){
    let volatileMemory = {}
    let self = this

    if (loadFunction) {
        loadFunction( (err, data) => {
            if(err){
                console.log(err.message);
            } else {
                volatileMemory = JSON.parse(data);
                console.log("BigFileStorageStrategy loading state:",volatileMemory);
            }
            if(afterInitialisation) afterInitialisation();
        });
    } else {
        if(afterInitialisation) afterInitialisation();
    }

    function autoStore(){
        if(storeFunction){
            let storedState = JSON.stringify(volatileMemory);
            storeFunction(storedState, function(err, res){
                if(err){
                    reportUserRelevantError(createOpenDSUErrorWrapper("Failed to autostore db file", err));
                }
                console.log("BigFileStorageStrategy storing state:",storedState, volatileMemory);
            });
        }
    }

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
            setTimeout(() => autoStore(), 0)
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
}
module.exports = BigFileStorageStrategy;