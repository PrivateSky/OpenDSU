const methodsNames = require("../didMethodsNames");
const memoryDb = require('../../index').loadAPI('db').getInMemoryDB();
const TABLE_NAME_PREFIX = 'contract:signatures';

function ContractDID_Document(name) {
    const openDSU = require("opendsu");
    const crypto = openDSU.loadAPI("crypto");

    this.getMethodName = () => {
        return methodsNames.SMART_CONTRACT_SUBTYPE;
    }

    this.getIdentifier = () => {
        return `did:ssi:contract:${name}`;
    };
    
    this.getName = () => {
        return name;
    }

    this.sign = (data, callback) => {
        const timestamp = process.hrtime.bigint().toString(16);
        const payload = {
            data,
            timestamp
        };
        const hash = crypto.sha256(payload);

        const table = `${TABLE_NAME_PREFIX}:${name}`;
        memoryDb.insertRecord(table, hash, { timestamp }, (err, result) => {
            if (err) {
                return callback(err);
            }
            callback(undefined, Buffer.from(result.pk, 'ascii'));
        });
    };

    this.verify = (data, signature, callback) => {
        if (Buffer.isBuffer(signature)) {
            signature = signature.toString('ascii');
        }
        const table = `${TABLE_NAME_PREFIX}:${name}`;
        memoryDb.getRecord(table, signature, (err, record) => {
            if (err) {
                return callback(err);
            }
            memoryDb.deleteRecord(table, signature, (err) => {
                const hash = crypto.sha256({
                    data,
                    timestamp: record.timestamp
                });
                callback(err, signature === hash);
            })
        });
    };

    this.getPublicKey = (format, callback) => {
        callback(new Error('Unsupported method call'));
    };

    this.getPrivateKeys = () => {
        return;
    };

    this.findPrivateKeysInSecurityContext = (callback) => {
        callback(new Error('Unsupported method call'));
    };

    this.encryptMessage = (receiverDID, message, callback) => {
        callback(new Error('Unsupported method call'));
    };

    this.decryptMessage = (encryptedMessage, callback) => {
        callback(new Error('Unsupported method call'));
    };

    this.getHash = () => {
        throw new Error('Unsupported method call');
    };

    this.sendMessage = (message, toOtherDID, callback) => {
        callback(new Error('Unsupported method call'));
    };

    this.readMessage = (callback) => {
        callback(new Error('Unsupported method call'));
    };

    this.on = (callback) => {
        callback(new Error('Unsupported method call'));
    };

    this.revokeDID = (callback) => {
        callback(new Error('Unsupported method call'));
    };

    this.revokeKey = (key, callback) => {
        callback(new Error('Unsupported method call'));
    };

    this.getControllerKey = (callback) => {
        callback(new Error('Unsupported method call'));
    };

    this.getPublicKeys = (callback) => {
        callback(new Error('Unsupported method call'));
    };

    this.getDomain = () => {
    }
}

module.exports = {
    initiateDIDDocument: function (name) {
        return new ContractDID_Document(name)
    },
    createDIDDocument: function (tokens) {
        return new ContractDID_Document(tokens[3]);
    }
};
