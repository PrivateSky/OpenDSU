function APIHUBProxy(domain, enclaveDID) {
    const http = require("opendsu").loadAPI("http");
    const system = require("opendsu").loadAPI("system");
    const url = `${system.getBaseURL()}/runEnclaveCommand/${domain}/${enclaveDID}`;

    this.insertRecord = (forDID, table, pk, plainRecord, encryptedRecord, callback) => {
        const command = {
            commandName: "insertRecord",
            params: {
                forDID: forDID,
                tableName: table,
                pk: pk,
                plainRecord,
                encryptedRecord
            }
        }

        http.doPut(url, JSON.stringify(command), callback);
    }

    this.updateRecord = (forDID, table, pk, plainRecord, encryptedRecord, callback) => {
        const command = {
            commandName: "updateRecord",
            params: {
                forDID: forDID,
                tableName: table,
                pk: pk,
                plainRecord,
                encryptedRecord
            }
        }

        http.doPut(url, JSON.stringify(command), callback);
    }

    this.getRecord = (forDID, table, pk, callback) => {
        const command = {
            commandName: "getRecord",
            params: {
                forDID: forDID,
                tableName: table,
                pk: pk
            }
        }

        http.doPut(url, JSON.stringify(command), callback);
    };

    this.filter = (forDID, table, filter, sort, limit, callback) => {
        const command = {
            commandName: "updateRecord",
            params: {
                forDID: forDID,
                tableName: table,
                query: filter,
                sort,
                limit
            }
        }

        http.doPut(url, JSON.stringify(command), callback);
    }

    this.deleteRecord = (forDID, table, pk, callback) => {
        const command = {
            commandName: "deleteRecord",
            params: {
                forDID: forDID,
                tableName: table,
                pk: pk
            }
        }

        http.doPut(url, JSON.stringify(command), callback);
    }


    this.addInQueue = (forDID, queueName, encryptedObject, callback) => {
        const command = {
            commandName: "addInQueue",
            params: {
                forDID: forDID,
                queueName: queueName,
                encryptedObject
            }
        }

        http.doPut(url, JSON.stringify(command), callback);
    }
    this.queueSize = (forDID, queueName, callback) => {
        const command = {
            commandName: "queueSize",
            params: {
                forDID: forDID,
                queueName: queueName
            }
        }

        http.doPut(url, JSON.stringify(command), callback);
    }

    this.listQueue = (forDID, queueName, sortAfterInsertTime, onlyFirstN, callback) => {
        const command = {
            commandName: "listQueue",
            params: {
                forDID: forDID,
                queueName: queueName,
                sortAfterInsertTime,
                onlyFirstN
            }
        }

        http.doPut(url, JSON.stringify(command), callback);
    };

    this.getObjectFromQueue = (forDID, queueName, hash, callback) => {
        const command = {
            commandName: "getObjectFromQueue",
            params: {
                forDID: forDID,
                queueName: queueName,
                hash
            }
        }

        http.doPut(url, JSON.stringify(command), callback);
    }
    this.deleteObjectFromQueue = (forDID, queueName, hash, callback) => {
        const command = {
            commandName: "deleteObjectFromQueue",
            params: {
                forDID: forDID,
                queueName: queueName,
                hash
            }
        }

        http.doPut(url, JSON.stringify(command), callback);
    }
}

module.exports = APIHUBProxy;