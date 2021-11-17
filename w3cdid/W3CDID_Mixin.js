/*
    W3CDID Minxin is abstracting the DID document for OpenDSU compatible DID methods

    did:whatever   resolved to an OpenDSU abstraction: W3CDIDDocument
    verify signatures
    sign
    send and receive encrypted messages


 */

function W3CDID_Mixin(target, enclave) {
    const openDSU = require("opendsu");
    const dbAPI = openDSU.loadAPI("db");
    const crypto = openDSU.loadAPI("crypto");
    target.findPrivateKeysInSecurityContext = function (callback) {
    };

    const __ensureEnclaveExistsThenExecute = (fnName, ...args) => {
        const callback = args[args.length - 1];
        if (typeof enclave === "undefined") {
            dbAPI.getMainEnclave((err, mainEnclave) => {
                if (err) {
                    return callback(err);
                }

                enclave = mainEnclave;
                enclave[fnName](...args);
            })
        } else {
            enclave[fnName](...args);
        }
    }

    target.sign = function (hash, callback) {
        __ensureEnclaveExistsThenExecute("signForDID", target, hash, callback);
    };

    target.verify = function (hash, signature, callback) {
        __ensureEnclaveExistsThenExecute("verifyForDID", target, hash, signature, callback);
    };

    /*Elliptic Curve Integrated Encryption Scheme
     * https://github.com/bin-y/standard-ecies/blob/master/main.js
     * https://www.npmjs.com/package/ecies-lite  //try to use functions from SSI and from crypto
     * https://github.com/ecies/js
     * https://github.com/sigp/ecies-parity
     * https://github.com/pedrouid/eccrypto-js
     *
     * annoncrypt  - symertric enc (IES)
     * authcrypt   -  asymetric enc + sign
     * plaintext   + asym sign
     *
     * A -> B   sign(enc( ASYM_PK_B, M), PK_A)
     * */

    target.encryptMessage = function (receiverDID, message, callback) {
        __ensureEnclaveExistsThenExecute("encryptMessage", target, receiverDID, message, callback);
    };

    target.decryptMessage = function (encryptedMessage, callback) {
        __ensureEnclaveExistsThenExecute("decryptMessage", target, encryptedMessage, callback);
    };

    /* messages to the APiHUb MQ compatible APIs

      * */

    target.getHash = () => {
        return crypto.sha256(target.getIdentifier());
    };

    target.sendMessage = function (message, toOtherDID, callback) {
        if (typeof message === "object") {
            try {
                message = message.getSerialisation();
            } catch (e) {
                return callback(e);
            }
        }
        const mqHandler = require("opendsu")
            .loadAPI("mq")
            .getMQHandlerForDID(toOtherDID);
        target.encryptMessage(toOtherDID, message, (err, encryptedMessage) => {
            if (err) {
                return callback(
                    createOpenDSUErrorWrapper(`Failed to encrypt message`, err)
                );
            }

            mqHandler.writeMessage(JSON.stringify(encryptedMessage), callback);
        });
    };

    target.readMessage = function (callback) {
        const mqHandler = require("opendsu")
            .loadAPI("mq")
            .getMQHandlerForDID(target);
        mqHandler.previewMessage((err, encryptedMessage) => {
            if (err) {
                return mqHandler.deleteMessage(encryptedMessage.messageId, () => callback(err));
            }

            let message;
            try {
                message = JSON.parse(encryptedMessage.message);
            } catch (e) {
                return callback(e);
            }

            mqHandler.deleteMessage(encryptedMessage.messageId, (err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to delete message`, err));
                }
                target.decryptMessage(message, callback);
            })
        });
    };

    target.getEnclave = () => {
        return enclave;
    }

    target.on = function (callback) {
    };

    target.revokeDID = function (callback) {
    };

    target.revokeKey = function (key, callback) {
    };

    target.getControllerKey = function (callback) {
    };

    target.getPublicKeys = function (callback) {
    };

    target.getDomain = function () {
    }
}

module.exports = W3CDID_Mixin;
