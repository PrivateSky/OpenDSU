function SingleDSUStorageStrategy() {
    let volatileMemory = {}
    let self = this
    let storageDSU;
    let shareableSSI;
    let dbName;

    this.initialise = function(_storageDSU, _dbName){
        storageDSU              = _storageDSU;
        dbName                  = _dbName;
    }

    function readTheWholeTable(tableName, callback) {
        getPrimaryKeys(tableName, (err, recordKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read the records in table ${tableName}`, err));
            }
            const table = {};
            const TaskCounter = require("swarmutils").TaskCounter;
            const tc = new TaskCounter(() => {
                return callback(undefined, table);
            });
            tc.increment(recordKeys.length);
            recordKeys.forEach(recordKey => {
                self.getRecord(tableName, recordKey, (err, record) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to get record ${recordKey} in table ${tableName}`, err));
                    }

                    table[recordKey] = record;
                    tc.decrement();
                });
            })
        });
    }

    /*
       Get the whole content of the table and asynchronously returns an array with all the  records satisfying the condition tested by the filterFunction
    */
    this.filterTable = function (tableName, filterFunction, callback) {
        readTheWholeTable(tableName, function (err, tbl) {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read table ${tableName}`, err));
            }
            let result = [];
            for (let n in tbl) {
                let item = tbl[n];
                if (filterFunction(item)) {
                    item.__key = n;
                    result.push(item);
                }
            }
            callback(undefined, result);
        });
    };

    /*
        where field1 >=3 and field2 <=7 and field2 like /regex/ == !=
        [operator, field, value]
     */
    this.filter = function (tableName, query, sort, limit, callback) {
        // loadIndex(tableName, query[1],  (err, index)=>{
        //     if (err) {
        //         return callback(createOpenDSUErrorWrapper(`Failed to load index for field ${query[1]}`, err));
        //     }
        // });
    }

    this.addIndex = function (tableName, fieldName, callback) {
        createIndex(tableName, fieldName, (err) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to create index for field ${fieldName} in table ${tableName}`, err));
            }

            updateIndexesList(tableName, fieldName, (err) => {
                let retErr = undefined;
                if (err) {
                    retErr = createOpenDSUErrorWrapper(`Failed to add ${fieldName} to indexes list for table ${tableName}`, err);
                }

                callback(retErr);
            });
        });
    }

    function getIndex(tableName, fieldName, callback) {
        fieldIsIndexed()
    }

    function createIndex(tableName, fieldName, callback) {
        const indexPath = `/data/${dbName}/${tableName}/index_${fieldName}`;
        readTheWholeTable(tableName, (err, table) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read table ${tableName}`));
            }

            const path = require("swarmutils").path;
            const TaskCounter = require("swarmutils").TaskCounter;
            const tc = new TaskCounter(() => {
                return callback(undefined);
            });

            tc.increment(Object.keys(table).length);
            for (let pk in table) {
                const item = table[pk];
                const indexFilePath = path.join(indexPath, `${pk}:=${item[fieldName]}`);
                storageDSU.createFile(indexFilePath, (err) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to create index for field ${fieldName} in table ${tableName}`, err));
                    }

                    tc.decrement();
                });
            }
        });
    }

    function updateIndex(tableName, fieldName, pk, value, callback) {
        const indexFilePath = `/data/${dbName}/${tableName}/index_${fieldName}/${pk}:=${value}`;
        storageDSU.createFile(indexFilePath, (err) => {
            let retErr = undefined;
            if (err) {
                retErr = createOpenDSUErrorWrapper(`Failed to create file ${indexFilePath}`, err);
            }

            callback(retErr);
        });
    }

    function updateIndexes(tableName, pk, record, callback){
        const TaskCounter = require("swarmutils").TaskCounter;
        const tc = new TaskCounter(() => {
            return callback(undefined);
        });

        const fields = Object.keys(record);
        getIndexesList(tableName, (err, indexedFields) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get indexed fields list for table ${tableName}`, err));
            }

            if (indexedFields.length === 0) {
                return callback();
            }

            tc.increment(fields.length);
            fields.forEach(field => {
                if(indexedFields.findIndex(field) !== -1){
                    updateIndex(tableName, field, pk, record[field], (err) => {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper(`Failed to update index for field ${field} in table ${tableName}`, err));
                        }

                        tc.decrement();
                    });
                }else{
                    tc.decrement();
                }
            });
        });
    }

    function deleteIndex(tableName, fieldName, pk, value, callback) {
        const indexFilePath = `/data/${dbName}/${tableName}/index_${fieldName}/${pk}:=${value}`;
        storageDSU.deleteFile(indexFilePath, (err) => {
            let retErr = undefined;
            if (err) {
                retErr = createOpenDSUErrorWrapper(`Failed to delete file ${indexFilePath}`, err);
            }

            callback(retErr);
        });
    }

    function deleteIndexes(tableName, pk, record, callback){
        const TaskCounter = require("swarmutils").TaskCounter;
        const tc = new TaskCounter(() => {
            return callback(undefined);
        });

        const fields = Object.keys(record);
        getIndexesList(tableName, (err, indexedFields) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get indexed fields list for table ${tableName}`, err));
            }

            if (indexedFields.length === 0) {
                return callback();
            }

            tc.increment(fields.length);
            fields.forEach(field => {
                if(indexedFields.findIndex(field) !== -1){
                    deleteIndex(tableName, field, pk, record[field], (err) => {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper(`Failed to update index for field ${field} in table ${tableName}`, err));
                        }

                        tc.decrement();
                    });
                }else{
                    tc.decrement();
                }
            });
        });
    }

    function updateIndexesList(tableName, fieldName, callback) {
        const indexesFilePath = `/data/${dbName}/${tableName}/indexes`;
        getIndexesList(tableName, (err, indexes) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get indexes list for table ${tableName}`, err));
            }
            if (indexes.findIndex(fieldName) === -1) {
                return callback();
            }

            indexes.push(fieldName);
            storageDSU.writeFile(indexesFilePath, JSON.stringify(indexes), (err) => {
                let retErr = undefined;
                if (err) {
                    retErr = createOpenDSUErrorWrapper(`Failed to write file ${indexesFilePath}`, err);
                }

                callback(retErr);
            });
        });
    }

    function getIndexesList(tableName, callback) {
        const indexesFilePath = `/data/${dbName}/${tableName}/indexes`;
        storageDSU.readFile(indexesFilePath, (err, indexes) => {
            if (err) {
                return callback(undefined, []);
            }

            try {
                indexes = JSON.parse(indexes);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse indexes list ${indexes} for table ${tableName}`, e));
            }

            callback(undefined, indexes);
        });
    }

    function fieldIsIndexed(tableName, fieldName, callback) {
        getIndexesList(tableName, (err, indexes) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read indexes list for table ${tableName}`, err));
            }

            if (indexes.findIndex(fieldName) === -1) {
                return callback(undefined, false);
            }

            callback(undefined, true);
        });
    }

    /*
      Insert a record
    */
    this.insertRecord = function (tableName, key, record, callback) {
        console.log("Inserting:", tableName, key, record);
        this.updateRecord(tableName, key, record, undefined, callback);
    };

    function getPrimaryKeys(tableName, callback) {
        storageDSU.listFiles(`/data/${dbName}/${tableName}/records`, (err, primaryKeys) => {
            let retErr = undefined;
            if (err) {
                retErr = createOpenDSUErrorWrapper(`Failed to retrieve primary keys list in table ${tableName}`, err);
            }

            callback(retErr, primaryKeys);
        });
    }

    /*
        Update a record
     */
    this.updateRecord = function (tableName, key, record, currentRecord, callback) {
        const recordPath = `/data/${dbName}/${tableName}/records/${key}`;
        console.log("Updating", recordPath);
        storageDSU.writeFile(recordPath, JSON.stringify(record), function (err, res) {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to update record in ${recordPath}`, err));
            }

            if (typeof currentRecord !== "undefined") {
                deleteIndexes(tableName, key, currentRecord, (err) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to delete index files for record ${JSON.stringify(currentRecord)}`, err));
                    }

                    updateIndexes(tableName, key, record, callback);
                });
                return;
            }

            updateIndexes(tableName, key, record, callback);
        });
    };

    /*
        Get a single row from a table
     */
    this.getRecord = function (tableName, key, callback) {
        const recordPath = `/data/${dbName}/${tableName}/records/${key}`;
        console.log("Reading", recordPath);
        storageDSU.readFile(recordPath, function (err, res) {
            let record;
            let retErr = undefined;
            if (err) {
                retErr = createOpenDSUErrorWrapper(`Failed to read record in ${recordPath}`, err);
            } else {
                try {
                    record = JSON.parse(res);
                } catch (newErr) {
                    retErr = createOpenDSUErrorWrapper(`Failed to parse record in ${recordPath}: ${res}`, retErr);
                }
            }
            callback(retErr, record);
        });
    };

}

module.exports.SingleDSUStorageStrategy = SingleDSUStorageStrategy;