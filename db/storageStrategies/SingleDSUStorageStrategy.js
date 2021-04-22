const ObservableMixin = require("../../utils/ObservableMixin");

function SingleDSUStorageStrategy() {
    let volatileMemory = {}
    let self = this
    let storageDSU;
    let shareableSSI;
    let dbName;

    ObservableMixin(this);

    this.initialise = function (_storageDSU, _dbName) {
        storageDSU = _storageDSU;
        dbName = _dbName;
        this.dispatchEvent("initialised");
    }
    this.beginBatch = () => {
        storageDSU.beginBatch();
    }

    this.cancelBatch = (callback) => {
        storageDSU.cancelBatch(callback);
    }

    this.commitBatch = (callback) => {
        storageDSU.commitBatch(callback);
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

    function filterIndexedTable(tableName, query, callback) {
        let queryResults = [];
        const filteredRecords = [];

        function getRecordsRecursively(index) {
            const pk = queryResults[index];
            if (typeof pk === "undefined") {
                return callback(undefined, filteredRecords);
            }

            self.getRecord(tableName, pk, (err, record) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to get record with key ${pk} from table ${tableName}`, err));
                }

                record.__key = pk;
                filteredRecords.push(record);

                getRecordsRecursively(index + 1);
            });
        }


        loadValuesForIndex(tableName, query[0][0], (err, index) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to load index for field ${fieldQuery[0]} from table ${tableName}`, err));
            }

            for (let queryIndex = 0; queryIndex < query.length; queryIndex++) {
                index = applyQuery(index, query[queryIndex]);
            }

            return callback(undefined, index);

        });

    }


    function checkFieldIsIndexed(tableName, fieldName, callback) {
        const path = getIndexPath(tableName, fieldName);
        storageDSU.stat(path, (err, stat) => {
            if (err || typeof stat.type === "undefined") {
                return callback(undefined, false);
            }
            callback(undefined, true);
        });
    }

    this.filter = function (tableName, conditionsArray, sort, limit, callback) {
        if (typeof conditionsArray === "string") {
            conditionsArray = [conditionsArray];
        } else if (!Array.isArray(conditionsArray)) {
            return callback(Error(`Condition argument of filter function need to be string or array of strings`))
        }
        let Query = require("./Query");
        let query = new Query(conditionsArray);

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

        const indexName = query.getIndexName();
        checkFieldIsIndexed(tableName, indexName, (err, status) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to check if all fields are indexed in table ${tableName}`, err));
            }

            if (!status) {
                this.addIndex(tableName, indexName, (err) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to add index for fields ${indexName} in table ${tableName}`, err));
                    }

                    __filter();
                });
            } else {
                __filter();
            }

            function __filter() {
                storageDSU.listFolders(getIndexPath(tableName, indexName), (err, values) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed read values for field ${indexName}`, err));
                    }

                    let filteredValues = query.filterValuesForIndex(values);
                    query.sortValues(filteredValues, sort);
                    const getNextRecordForValue = getNextRecordFunction(tableName, indexName)
                    query.filter(filteredValues, getNextRecordForValue, limit, callback);
                });
            }
        });
    }


    function getNextRecordFunction(tableName, fieldName) {
        let currentValue;
        let pksArray;
        let currentPosition;

        function getNext(callback) {
            if (currentPosition >= pksArray.length) {
                return callback(undefined, null);
            }

            self.getRecord(tableName, pksArray[currentPosition++], callback);
        }

        return function (value, callback) {
            if (value !== currentValue) {
                storageDSU.listFiles(getIndexPath(tableName, fieldName, value), (err, pks) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`No primary key found for value ${value}`, err));
                    }

                    pksArray = pks;
                    currentPosition = 0;
                    currentValue = value
                    getNext(callback);
                });
            } else {
                getNext(callback);
            }
        }

    }

    this.addIndex = function (tableName, fieldName, callback) {
        createIndex(tableName, fieldName, (err) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to create index for field ${fieldName} in table ${tableName}`, err));
            }
            callback(undefined);
        });
    }

    function createIndex(tableName, fieldName, callback) {
        getPrimaryKeys(tableName, (err, primaryKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get primary keys for table ${tableName}`, err));
            }

            function createIndexFilesRecursively(index) {
                if (index === primaryKeys.length) {
                    return callback(undefined);
                }

                const pk = primaryKeys[index];
                self.getRecord(tableName, pk, (err, record) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to get record ${pk} from table ${tableName}`));
                    }

                    storageDSU.writeFile(getIndexPath(tableName, fieldName, record[fieldName], pk), undefined, (err) => {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper(`Failed to create index for field ${fieldName} in table ${tableName}`, err));
                        }

                        createIndexFilesRecursively(index + 1);
                    });
                });
            }

            createIndexFilesRecursively(0);
        });
    }

    function loadValuesForIndex(tableName, fieldName, callback) {
        const indexFolderPath = getIndexPath(tableName, fieldName);
        storageDSU.listFiles(indexFolderPath, (err, indexFiles) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to list files in folder ${indexFolderPath}`, err));
            }

            const index = [];
            indexFiles.forEach(indexFileName => {
                const splitIndexFileName = indexFileName.split(":=");
                index.push({
                    __key: splitIndexFileName[0],
                    value: splitIndexFileName[1]
                })
            });

            callback(undefined, index);
        })
    }

    function createIndexEntry(tableName, fieldName, pk, value, callback) {
        storageDSU.writeFile(getIndexPath(tableName, fieldName, value, pk), (err) => {
            let retErr = undefined;
            if (err) {
                retErr = createOpenDSUErrorWrapper(`Failed to create file ${getIndexPath(tableName, fieldName, value, pk)}`, err);
            }

            callback(retErr);
        });
    }

    function updateIndexesForRecord(tableName, pk, record, callback) {
        if(record.__deleted){
            //deleted records don't need to be into indexes
            return callback();
        }
        const fields = Object.keys(record);
        getIndexedFieldsList(tableName, (err, indexedFields) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get indexed fields list for table ${tableName}`, err));
            }

            if (indexedFields.length === 0) {
                return callback();
            }

            function updateIndexesRecursively(index) {
                const field = fields[index];
                if (typeof field === "undefined") {
                    return callback();
                }
                if (indexedFields.findIndex(indexedField => indexedField === field) !== -1) {
                    createIndexEntry(tableName, field, pk, record[field], (err) => {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper(`Failed to update index for field ${field} in table ${tableName}`, err));
                        }

                        updateIndexesRecursively(index + 1);
                    });
                } else {
                    updateIndexesRecursively(index + 1);
                }
            }

            updateIndexesRecursively(0);
        });
    }

    // pk and value can be undefined and you get only the path to index of fieldName
    function getIndexPath(tableName, fieldName, value, pk) {
        let path = `/${dbName}/${tableName}/indexes/${fieldName}`;
        if (typeof value !== "undefined") {
            path = `${path}/${value}`;
        }

        if (typeof pk !== "undefined") {
            path = `${path}/${pk}`;
        }
        return path;
    }

    function deleteIndex(tableName, fieldName, pk, value, callback) {
        storageDSU.delete(getIndexPath(tableName, fieldName, value, pk), (err) => {
            let retErr = undefined;
            if (err) {
                retErr = createOpenDSUErrorWrapper(`Failed to delete file ${getIndexPath(tableName, fieldName, value, pk)}`, err);
            }

            callback(retErr);
        });
    }

    function deleteIndexesForRecord(tableName, pk, record, callback) {
        const fields = Object.keys(record);
        getIndexedFieldsList(tableName, (err, indexedFields) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get indexed fields list for table ${tableName}`, err));
            }

            if (indexedFields.length === 0) {
                return callback();
            }

            function deleteIndexesRecursively(index) {
                const field = fields[index];
                if (typeof field === "undefined") {
                    return callback();
                }
                if (indexedFields.findIndex(indexedField => indexedField === field) !== -1) {
                    deleteIndex(tableName, field, pk, record[field], (err) => {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper(`Failed to delete index for field ${field} in table ${tableName}`, err));
                        }

                        deleteIndexesRecursively(index + 1);
                    });
                } else {
                    deleteIndexesRecursively(index + 1);
                }
            }

            deleteIndexesRecursively(0);
        });
    }

    function getIndexedFieldsList(tableName, callback) {
        const indexesFilePath = `/${dbName}/${tableName}/indexes`;
        storageDSU.listFolders(indexesFilePath, (err, indexes) => {
            if (err) {
                return callback(undefined, []);
            }

            callback(undefined, indexes);
        });
    }

    /*
      Insert a record
    */
    this.insertRecord = function (tableName, key, record, callback) {
        this.updateRecord(tableName, key, record, undefined, callback);
    };

    function getPrimaryKeys(tableName, callback) {
        storageDSU.listFiles(`/${dbName}/${tableName}/records`, (err, primaryKeys) => {
            if (err) {
                return storageDSU.createFolder(`/${dbName}/${tableName}/records`, (err) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to retrieve primary keys list in table ${tableName}`, err));
                    }
                    callback(undefined, []);
                });
            }

            callback(undefined, primaryKeys);
        });
    }

    /*
        Update a record
     */
    this.updateRecord = function (tableName, key, record, currentRecord, callback) {
        if (typeof record !== "object") {
            return callback(Error(`Invalid record type. Expected "object"`))
        }

        if (Buffer.isBuffer(record)) {
            return callback(Error(`"Buffer" is not a valid record type. Expected "object".`))
        }

        if (Array.isArray(record)) {
            return callback(Error(`"Array" is not a valid record type. Expected "object".`))
        }

        const recordPath = `/${dbName}/${tableName}/records/${key}`;
        storageDSU.writeFile(recordPath, JSON.stringify(record), function (err, res) {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to update record in ${recordPath}`, err));
            }

            if (typeof currentRecord !== "undefined") {
                return deleteIndexesForRecord(tableName, key, currentRecord, (err) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to delete index files for record ${JSON.stringify(currentRecord)}`, err));
                    }

                    return updateIndexesForRecord(tableName, key, record, (err) => {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper(`Failed to update indexes for record ${record}`, err));
                        }

                        callback(undefined, record);
                    });
                });
            }

            updateIndexesForRecord(tableName, key, record, (err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to update indexes for record ${record}`, err));
                }

                callback(undefined, record);
            });
        });
    };

    /*
        Get a single row from a table
     */
    this.getRecord = function (tableName, key, callback) {
        const recordPath = `/${dbName}/${tableName}/records/${key}`;
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