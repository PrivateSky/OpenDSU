
    function BigFileStorageStrategy(loadFunction, storeFunction, afterInitialisation){
    let volatileMemory = {

    }
    if(loadFunction){
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
    this.insertRecord = function(tableName, key, record, callback){
        let tbl = getTable(tableName);
        if(tbl[key] !== undefined){
            return callback(new Error("Can't insert a new record for key "+ key))
        }
        tbl[key] = record;
        autoStore();
        callback(undefined, record);
    };

    /*
        Update a record, return error if does not exists
     */
    this.updateRecord = function(tableName, key, record, callback){
        let tbl = getTable(tableName);
        if(tbl[key] === undefined){
            return callback(new Error("Can't update a record for key "+ key))
        }
        record.__previousRecord = tbl[key] ;
        tbl[key] = record;
        autoStore();
        callback(undefined, record);
    };

    /*
        Get a single row from a table
     */
    this.getRecord = function(tableName, key, callback){
        let tbl = getTable(tableName);
        let record = tbl[key];
        if( record === undefined){
            return callback(new Error("Can't retrieve a record for key "+ key))
        }
        callback(undefined,record);
    };
}
module.exports = BigFileStorageStrategy;