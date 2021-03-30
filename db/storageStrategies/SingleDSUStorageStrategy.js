function SingleDSUStorageStrategy() {
    let volatileMemory = {}
    let self = this
    let storageDSU;
    let shareableSSI;
    let dbName;

    this.initialise = function (_storageDSU, _dbName) {
        storageDSU = _storageDSU;
        dbName = _dbName;
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
    const operators = {
        "<": function (x, y) {
            return x < y
        },
        "<=": function (x, y) {
            return x <= y
        },
        ">": function (x, y) {
            return x > y
        },
        ">=": function (x, y) {
            return x >= y
        },
        "==": function (x, y) {
            return x == y
        },
        "like": function (str, regex) {
            return regex.test(str)
        },
    }
    this.filter = function (tableName, query, sort, limit, callback) {
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

        let compareFn;
        if (sort === "asc" || sort === "ascending") {
            compareFn = function (a, b) {
                return a.pk <= b.pk;
            };
        } else if (sort === "dsc" || sort === "descending") {
            compareFn = function (a, b) {
               return a.pk >= b.pk;
            };
        }

        loadIndex(tableName, query[1], (err, index) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to load index for field ${query[1]}`, err));
            }

            index.sort(compareFn);
            const filteredPKs = [];
            index.forEach(el => {
                if (operators[query[0]](el.value, query[2]) && filteredPKs.length <= limit) {
                    filteredPKs.push(el.pk);
                }
            });

            const filteredRecords = [];

            const TaskCounter = require("swarmutils").TaskCounter;
            const tc = new TaskCounter(() => {
                return callback(undefined, filteredRecords);
            });

            tc.increment(filteredPKs.length);
            filteredPKs.forEach(pk => {
                self.getRecord(tableName, pk, (err, record) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to get record with key ${pk} from table ${tableName}`, err));
                    }

                    filteredRecords.push(record);
                    tc.decrement();
                });
            })
        });
    }

    this.addIndex = function (tableName, fieldName, callback) {
        createIndex(tableName, fieldName, (err) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to create index for field ${fieldName} in table ${tableName}`, err));
            }
            callback(undefined);
        });
    }

    function loadIndex(tableName, fieldName, callback) {
        const indexFolderPath = `/data/${dbName}/${tableName}/index_${fieldName}`;
        storageDSU.listFiles(indexFolderPath, (err, indexFiles) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to list files in folder ${indexFolderPath}`, err));
            }

            const index = [];
            indexFiles.forEach(indexFileName => {
                const splitIndexFileName = indexFileName.split(":=");
                index.push({
                    pk: splitIndexFileName[0],
                    value: splitIndexFileName[1]
                })
            });

            callback(undefined, index);
        })
    }

    function createIndex(tableName, fieldName, callback) {
        const indexPath = `/data/${dbName}/${tableName}/index_${fieldName}`;
        readTheWholeTable(tableName, (err, table) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read table ${tableName}`));
            }

            const path = require("swarmutils").path;
            const tableKeys = Object.keys(table);

            function createIndexFilesRecursively(index){
                const pk = tableKeys[index];
                const item = table[pk];
                const indexFilePath = path.join(indexPath, `${pk}:=${item[fieldName]}`);
                storageDSU.writeFile(indexFilePath, (err) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to create index for field ${fieldName} in table ${tableName}`, err));
                    }

                    if (index + 1 === tableKeys.length) {
                        const indexesPath = `/data/${dbName}/${tableName}/indexes`;
                        return storageDSU.writeFile(indexesPath, JSON.stringify([fieldName]), callback)
                    }

                    createIndexFilesRecursively(index + 1);
                });
            }

            createIndexFilesRecursively(0);
        });
    }

    function updateIndex(tableName, fieldName, pk, value, callback) {
        const indexFilePath = `/data/${dbName}/${tableName}/index_${fieldName}/${pk}:=${value}`;
        storageDSU.writeFile(indexFilePath, (err) => {
            let retErr = undefined;
            if (err) {
                retErr = createOpenDSUErrorWrapper(`Failed to create file ${indexFilePath}`, err);
            }

            callback(retErr);
        });
    }

    function updateIndexesForRecord(tableName, pk, record, callback) {
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
                if (indexedFields.findIndex(field) !== -1) {
                    updateIndex(tableName, field, pk, record[field], (err) => {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper(`Failed to update index for field ${field} in table ${tableName}`, err));
                        }

                        tc.decrement();
                    });
                } else {
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

    function deleteIndexesForRecord(tableName, pk, record, callback) {
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
                if (indexedFields.findIndex(field) !== -1) {
                    deleteIndex(tableName, field, pk, record[field], (err) => {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper(`Failed to update index for field ${field} in table ${tableName}`, err));
                        }

                        tc.decrement();
                    });
                } else {
                    tc.decrement();
                }
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
                deleteIndexesForRecord(tableName, key, currentRecord, (err) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to delete index files for record ${JSON.stringify(currentRecord)}`, err));
                    }

                    updateIndexesForRecord(tableName, key, record, callback);
                });
                return;
            }

            updateIndexesForRecord(tableName, key, record, callback);
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