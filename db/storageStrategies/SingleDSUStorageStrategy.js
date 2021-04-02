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
            if (typeof regex === "string") {
                const splitRegex = regex.split("/");
                let flag = splitRegex.pop();
                if (flag === '') {
                    flag = undefined;
                }
                regex = new RegExp(splitRegex.join(''), flag);
            }
            return regex.test(str);
        },
    }

    function queryParser(query) {
        let parsedQuery = [];
        query.forEach(fieldQuery => {
            const splitQuery = fieldQuery.split(" ");
            if (splitQuery.length < 3) {
                throw Error(`Invalid query format. A query's format is <field> <operator> <value>`);
            }
            const operatorKeys = Object.keys(operators);
            const operatorIndex = splitQuery.findIndex(operator => {
                return operatorKeys.findIndex(el => el === operator) !== -1;
            });

            if (operatorIndex === -1) {
                throw Error(`The provided query does not contain a valid operator.`);
            }

            const field = splitQuery.slice(0, operatorIndex).join(" ");
            const operator = splitQuery[operatorIndex];
            const value = splitQuery.slice(operatorIndex + 1).join(" ");

            parsedQuery.push([field, operator, value]);
        });

        return parsedQuery;
    }

    function getNotIndexedFieldsInQuery(tableName, query, callback) {
        getIndexedFieldsList(tableName, (err, indexedFieldsList) => {
            const queryFields = query.map(fieldQuery => fieldQuery[0]);
            if (err) {
                return callback(undefined, queryFields);
            }

            const indexedFieldsSet = new Set(indexedFieldsList);
            let res = queryFields.filter(field => !indexedFieldsSet.has(field));

            callback(undefined, res);
        });
    }

    function filterWholeTable(tableName, query, callback) {
        readTheWholeTable(tableName, (err, tbl) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read table ${tableName}`, err));
            }

            let fieldQueryResults = [];
            query.forEach(fieldQuery => {
                let filteredPKs = [];
                for (let key in tbl) {
                    const record = tbl[key];
                    record.__key = key;

                    if (operators[fieldQuery[1]](record[fieldQuery[0]], fieldQuery[2])) {
                        filteredPKs.push(record.__key);
                    }
                }
                fieldQueryResults.push(filteredPKs);
            })

            const queryResults = findIntersection(fieldQueryResults);
            const filteredRecords = queryResults.map(queryResult => tbl[queryResult]);
            callback(undefined, filteredRecords);
        });
    }

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

        function filterIndexedTableRecursively(fieldQueryIndex) {
            const fieldQuery = query[fieldQueryIndex];
            if (typeof fieldQuery === "undefined") {
                queryResults = findIntersection(queryResults);
                return getRecordsRecursively(0);
            }

            loadIndex(tableName, fieldQuery[0], (err, index) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to load index for field ${fieldQuery[0]} from table ${tableName}`, err));
                }

                const filteredPKs = [];
                index.forEach(el => {
                    if (operators[fieldQuery[1]](el.value, fieldQuery[2])) {
                        filteredPKs.push(el.__key);
                    }
                });

                queryResults.push(filteredPKs);
                filterIndexedTableRecursively(fieldQueryIndex + 1);
            });
        }

        filterIndexedTableRecursively(0);
    }


    function getCompareFunction(field, sortOrder) {
        if (sortOrder === "asc" || sortOrder === "ascending") {
            return function (a, b) {
                if (a[field] < b[field]) {
                    return -1;
                }

                if (a[field] === b[field]) {
                    return 0
                }

                if ([field] > b[field]) {
                    return 1;
                }
            }
        } else if (sortOrder === "dsc" || sortOrder === "descending") {
            return function (a, b) {
                if (a[field] > b[field]) {
                    return -1;
                }

                if (a[field] === b[field]) {
                    return 0
                }

                if (a[field] < b[field]) {
                    return 1;
                }
            }
        } else {
            throw Error(`Invalid sort order provided <${sortOrder}>`);
        }
    }

    this.filter = function (tableName, query, sort, limit, callback) {
        if (!Array.isArray(query)) {
            query = [query];
        }
        query = queryParser(query);

        if (typeof query === "function") {
            callback = query;
            query = undefined;
            sort = undefined;
            limit = undefined;
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

        let compareFn;
        try {
            compareFn = getCompareFunction(query[0][0], sort);
        } catch (e) {
            return callback(createOpenDSUErrorWrapper(`Failed to get compare function`, e));
        }

        getNotIndexedFieldsInQuery(tableName, query, (err, notIndexedFields) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to check if all fields are indexed in table ${tableName}`, err));
            }

            addIndexes(tableName, notIndexedFields, (err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to add indexes for fields ${notIndexedFields} in table ${tableName}`, err));
                }

                filterIndexedTable(tableName, query, (err, filteredRecords) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to filter indexed table ${tableName}`, err));
                    }

                    filteredRecords.sort(compareFn);
                    callback(undefined, filteredRecords.slice(0, limit));
                });
            });
        });
    }

    function findIntersection(results) {
        if (results.length === 0) {
            return [];
        }
        let sets = [];
        results.forEach(result => {
            sets.push(new Set(result));
        })

        let intersection = sets[0];
        for (let i = 1; i < sets.length; i++) {
            intersection = new Set([...intersection].filter(el => sets[i].has(el)));
        }

        return [...intersection];
    }

    this.addIndex = function (tableName, fieldName, callback) {
        createIndex(tableName, fieldName, (err) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to create index for field ${fieldName} in table ${tableName}`, err));
            }
            callback(undefined);
        });
    }

    function addIndexes(tableName, fields, callback) {

        function addIndexesRecursively(fieldIndex) {
            const field = fields[fieldIndex];
            if (typeof field === "undefined") {
                return callback();
            }

            self.addIndex(tableName, field, (err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to create index for field ${field} in table ${tableName}`, err));
                }

                addIndexesRecursively(fieldIndex + 1);
            });
        }

        addIndexesRecursively(0);
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
                    __key: splitIndexFileName[0],
                    value: splitIndexFileName[1]
                })
            });

            callback(undefined, index);
        })
    }

    function createIndex(tableName, fieldName, callback) {
        getPrimaryKeys(tableName, (err, primaryKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get primary keys for table ${tableName}`, err));
            }

            const indexPath = `/data/${dbName}/${tableName}/index_${fieldName}`;
            const path = require("swarmutils").path;

            function createIndexFilesRecursively(index) {
                const pk = primaryKeys[index];
                if (typeof pk === "undefined") {
                    return getIndexedFieldsList(tableName, (err, indexedFieldsList) => {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper(`Failed to get indexes list for table ${tableName}`));
                        }

                        indexedFieldsList.push(fieldName);
                        const indexesPath = `/data/${dbName}/${tableName}/indexes`;
                        return storageDSU.writeFile(indexesPath, JSON.stringify(indexedFieldsList), callback)

                    });
                }
                self.getRecord(tableName, pk, (err, record) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper(`Failed to get record ${pk} from table ${tableName}`));
                    }

                    const indexFilePath = path.join(indexPath, `${pk}:=${record[fieldName]}`);
                    storageDSU.writeFile(indexFilePath, (err) => {
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
                    updateIndex(tableName, field, pk, record[field], (err) => {
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

    function deleteIndex(tableName, fieldName, pk, value, callback) {
        const indexFilePath = `/data/${dbName}/${tableName}/index_${fieldName}/${pk}:=${value}`;
        storageDSU.delete(indexFilePath, (err) => {
            let retErr = undefined;
            if (err) {
                retErr = createOpenDSUErrorWrapper(`Failed to delete file ${indexFilePath}`, err);
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
        storageDSU.writeFile(recordPath, JSON.stringify(record), function (err, res) {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to update record in ${recordPath}`, err));
            }

            // if (typeof currentRecord !== "undefined") {
            //     deleteIndexesForRecord(tableName, key, currentRecord, (err) => {
            //         if (err) {
            //             return callback(createOpenDSUErrorWrapper(`Failed to delete index files for record ${JSON.stringify(currentRecord)}`, err));
            //         }
            //
            //         updateIndexesForRecord(tableName, key, record, callback);
            //     });
            //     return;
            // }

            updateIndexesForRecord(tableName, key, record, callback);
        });
    };

    /*
        Get a single row from a table
     */
    this.getRecord = function (tableName, key, callback) {
        const recordPath = `/data/${dbName}/${tableName}/records/${key}`;
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