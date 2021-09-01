function InMemoryDB() {
    const storage = {};

    this.filter = function (tableName, query, sort, limit, callback) {

    };

    this.query = this.filter;

    function getDefaultCallback(message, tableName, key) {
        return function (err, res) {
            if (err) {
                reportUserRelevantError(message + ` with errors in table ${tableName} for key ${key}`, err);
            } else {
                console.log(message, `in table ${tableName} for key ${key}`);
            }
        }
    }

    /*
      Insert a record, return an error if an record with thew same key already exists
    */
    this.insertRecord = function (tableName, key, record, callback) {
        callback = callback ? callback : getDefaultCallback("Inserting a record", tableName, key);

        self.getRecord(tableName, key, function (err, res) {
            if (!err || res) {
                //newRecord = Object.assign(newRecord, {__version:-1});
                return callback(createOpenDSUErrorWrapper("Failed to insert over an existing record", new Error("Trying to insert into existing record")));
            }
            const sharedDSUMetadata = {}
            sharedDSUMetadata.__version = 0;
            sharedDSUMetadata.pk = key;
            //sharedDSUMetadata.__changeId = uid();
            sharedDSUMetadata.__timestamp = Date.now();
            storageStrategy.insertRecord(tableName, key, Object.assign(sharedDSUMetadata, record), (err, res) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to insert record with key ${key} in table ${tableName} `, err));
                }

                self.dispatchEvent("change", JSON.stringify({table: tableName, pk: key}));
                callback(undefined, res);
            });
        });
    };


    /*
        Update a record, return an error if does not exists (does not do an insert)
     */
    this.updateRecord = function (tableName, key, newRecord, callback) {
        callback = callback ? callback : getDefaultCallback("Updating a record", tableName, key);
        let currentRecord;

        function doVersionIncAndUpdate(currentRecord, callback) {
            newRecord.__version++;
            newRecord.__timestamp = Date.now();
            //newRecord.__changeId = uid();

            if (newRecord.__version == 0) {
                storageStrategy.insertRecord(tableName, key, newRecord, callback);
            } else {
                storageStrategy.updateRecord(tableName, key, newRecord, currentRecord, callback);
            }
        }

        self.getRecord(tableName, key, function (err, res) {
            if (err || !res) {
                //newRecord = Object.assign(newRecord, {__version:-1});
                return callback(createOpenDSUErrorWrapper("Failed to update a record that does not exist", err));
            }
            if (res) {
                currentRecord = res;
                newRecord.__version = currentRecord.__version;
                newRecord.pk = key;
            }
            doVersionIncAndUpdate(currentRecord, (err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to update record with key ${key} in table ${tableName} `, err));
                }

                self.dispatchEvent("change", JSON.stringify({table: tableName, pk: key}));
                callback(undefined, newRecord);
            });
        });
    }

    /*
        Get a single row from a table
     */
    this.getRecord = function (tableName, key, callback) {
        storageStrategy.getRecord(tableName, key, function (err, res) {
            if (err || res.__deleted) {
                return callback(createOpenDSUErrorWrapper(`Missing record in table ${tableName} and key ${key}`, err));
            }
            callback(undefined, res);
        });
    };

}

module.exports = InMemoryDB;