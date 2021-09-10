const {createOpenDSUErrorWrapper} = require("../../error");

function ProxyMixin(target) {
    const openDSU = require("opendsu");
    const commandNames = require("./lib/commandsNames");
    const {createCommandObject} = require("./lib/createCommandObject");

    target.insertRecord = (forDID, table, pk, plainRecord, encryptedRecord, callback) => {
        target.__putCommandObject(commandNames.INSERT_RECORD, forDID, table, pk, plainRecord, encryptedRecord, callback);
    };

    target.updateRecord = (forDID, table, pk, plainRecord, encryptedRecord, callback) => {
        target.__putCommandObject(commandNames.UPDATE_RECORD, forDID, table, pk, plainRecord, encryptedRecord, callback);
    }

    target.getRecord = (forDID, table, pk, callback) => {
        target.__putCommandObject(commandNames.GET_RECORD, forDID, table, pk, (err, record) => {
            if (err) {
                return createOpenDSUErrorWrapper(`Failed to get record with pk ${pk}`, err);
            }

            try {
                record = JSON.parse(record);
            } catch (e) {
                return createOpenDSUErrorWrapper(`Failed to parse record with pk ${pk}`, e);
            }

            callback(undefined, record);
        });
    };

    target.filter = (forDID, table, filter, sort, limit, callback) => {
        if (typeof filter === "function") {
            callback = filter;
            filter = undefined;
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
        target.__putCommandObject(commandNames.FILTER_RECORDS, forDID, table, filter, sort, limit, (err, records) => {
            if (err) {
                return createOpenDSUErrorWrapper(`Failed to filter records in table ${table}`, err);
            }

            try {
                records = JSON.parse(records);
            } catch (e) {
                return createOpenDSUErrorWrapper(`Failed to parse record `, e);
            }

            callback(undefined, records);
        });
    }

    target.deleteRecord = (forDID, table, pk, callback) => {
        target.__putCommandObject(commandNames.DELETE_RECORD, forDID, table, pk, callback);
    }

    target.addInQueue = (forDID, queueName, encryptedObject, callback) => {
        target.__putCommandObject(commandNames.ADD_IN_QUEUE, forDID, queueName, encryptedObject, callback);
    }

    target.queueSize = (forDID, queueName, callback) => {
        target.__putCommandObject(commandNames.QUEUE_SIZE, forDID, queueName, callback);
    }

    target.listQueue = (forDID, queueName, sortAfterInsertTime, onlyFirstN, callback) => {
        target.__putCommandObject(commandNames.LIST_QUEUE, forDID, queueName, sortAfterInsertTime, onlyFirstN, callback);
    };

    target.getObjectFromQueue = (forDID, queueName, hash, callback) => {
        target.__putCommandObject(commandNames.GET_OBJECT_FROM_QUEUE, forDID, queueName, hash, callback);
    }

    target.deleteObjectFromQueue = (forDID, queueName, hash, callback) => {
        target.__putCommandObject(commandNames.DELETE_OBJECT_FROM_QUEUE, forDID, queueName, hash, callback);
    }
}

module.exports = ProxyMixin;