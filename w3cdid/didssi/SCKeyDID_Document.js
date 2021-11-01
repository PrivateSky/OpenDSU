const methodsNames = require("../didMethodsNames");
const memoryDb = require('../../index').loadAPI('db').getInMemoryDB();
const TABLE_NAME = 'sckey:signatures';

function SCKeyDID_Document(isInitialisation, publicKey) {
    let privateKey;
    const openDSU = require("opendsu");
    const crypto = openDSU.loadAPI("crypto");

    const init = () => {
        if (isInitialisation) {
            privateKey = crypto.generateRandom(32);
            publicKey = crypto.generateRandom(32);
        }
    };

    const getRawPublicKey = () => {
        return crypto.decodeBase58(publicKey);
    }

    this.getPublicKey = (format, callback) => {
        let pubKey = getRawPublicKey();
        if (format === "raw") {
            return callback(undefined, pubKey);
        }

        callback(undefined, publicKey);
    };

    this.getMethodName = () => {
        return methodsNames.SMART_CONTRACT_KEY_SUBTYPE;
    }

    this.getIdentifier = () => {
        return `did:sckey:${publicKey}`;
    };

    this.getPrivateKeys = () => {
        return [privateKey];
    };

    this.sign = (hash, callback) => {
        // TODO: add an 'expire' property
        memoryDb.insertRecord(TABLE_NAME, publicKey, { hash }, (err, result) => {
            if (err) {
                return callback(err);
            }
            callback(undefined, Buffer.from(result.pk, 'ascii'));
        });
    };

    this.verify = (hash, signature, callback) => {
        if (Buffer.isBuffer(signature)) {
            signature = signature.toString('ascii');
        }
        memoryDb.getRecord(TABLE_NAME, signature, (err, record) => {
            if (err) {
                return callback(err);
            }
            memoryDb.deleteRecord(TABLE_NAME, signature, (err) => {
                callback(err, hash === record.hash);
            })
        });
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

    init();
}

module.exports = {
    initiateDIDDocument: function () {
        return new SCKeyDID_Document(true)
    },
    createDIDDocument: function (tokens) {
        return new SCKeyDID_Document(false, tokens[2]);
    }
};
