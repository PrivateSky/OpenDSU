


function SingleDSUStorageStrategy(){
    let volatileMemory = {}
    let self = this
    let storageDSU;
    let shareableSSI;
    let dbName;

    this.initialise = function(_storageDSU, _dbName){
        storageDSU              = _storageDSU;
        dbName                  = _dbName;
    }

    function readTheWholeTable(tableName, callback){

    }

    /*
       Get the whole content of the table and asynchronously returns an array with all the  records satisfying the condition tested by the filterFunction
    */
    this.filterTable = function(tableName, filterFunction, callback){
        let tbl = readTheWholeTable(tableName, function(err, tbl){
            let result = [];
            for(let n in tbl){
                let item = tbl[n];
                if(filterFunction(item)){
                    item.__key = n;
                    result.push(item);
                }
            }
            callback(undefined,result);
        });
    };

    /*
      Insert a record
    */
    this.insertRecord = function(tableName, key, record, callback){
        console.log("Inserting:", tableName, key, record);
        this.updateRecord(tableName, key, record, undefined, callback);
    };

    /*
        Update a record
     */
    this.updateRecord = function(tableName, key, record, currentRecord, callback){
        console.log("Updating", `/data/${dbName}/${tableName}/${key}`);
        storageDSU.writeFile(`/data/${dbName}/${tableName}/${key}`, JSON.stringify(record), function(err, res){
            let retErr = undefined;
            if(err){
                retErr = createOpenDSUErrorWrapper(`Failed to update record in /data/${dbName}/${tableName}/${key}`, err);
            }
            callback(retErr, res);
        });
    };

    /*
        Get a single row from a table
     */
    this.getRecord = function(tableName, key, callback){
        console.log("Reading", `/data/${dbName}/${tableName}/${key}`);
        storageDSU.readFile(`/data/${dbName}/${tableName}/${key}`, function(err, res){
            let record;
            let retErr = undefined;
            if(err){
                retErr = createOpenDSUErrorWrapper(`Failed to read record in /data/${dbName}/${tableName}/${key}`, err);
            } else {
                try{
                    record = JSON.parse(res);
                } catch(newErr){
                    retErr = createOpenDSUErrorWrapper(`Failed to parse record in /data/${dbName}/${tableName}/${key}: ${res}` , retErr);
                }
            }
            callback(retErr, record);
        });
    };

}

module.exports.SingleDSUStorageStrategy = SingleDSUStorageStrategy;