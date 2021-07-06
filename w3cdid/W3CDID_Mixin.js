/*
    W3CDID Minxin is abstracting the DID document for OpenDSU compatible DID methods

    did:whatever   resolved to an OpenDSU abstraction: W3CDIDDocument
    verify signatures
    sign
    send and receive encrypted messages


 */

function W3CDID_Mixin(target) {

    const securityContext = require("opendsu").loadAPI("sc").getSecurityContext();
    const keySSISpace = require("opendsu").loadAPI("keyssi");
    const crypto = require("opendsu").loadAPI("crypto");
    target.findPrivateKeysInSecurityContext = function (callback) {

    };

    target.sign = function (hash, callback) {
        securityContext.signAsDID(target, hash, callback);
    };

    target.verify = function (hash, signature, callback) {
        securityContext.verifyForDID(target, hash, signature, callback);
    };

    target.signImpl = (privateKeys, data, callback) => {
        const keySSI = keySSISpace.createTemplateSeedSSI(target.getDomain());
        keySSI.initialize(keySSI.getDLDomain(), privateKeys[0]);
        crypto.sign(keySSI, data, callback);
    };

    target.verifyImpl = (data, signature, callback) => {
        target.getPublicKey("pem", (err, publicKey) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read public key for did ${target.getIdentifier()}`, err));
            }

            const templateKeySSI = keySSISpace.createTemplateSeedSSI(target.getDomain());
            crypto.verifySignature(templateKeySSI, data, signature, publicKey, callback);
        });
    }
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
        securityContext.encryptForDID(target, receiverDID, message, callback);
    };

    target.decryptMessage = function (encryptedMessage, callback) {
        securityContext.decryptAsDID(target, encryptedMessage, callback);
    };

    const saveNewKeyPairInSC = async (didDocument, compatibleSSI) => {
        try {
            await $$.promisify(securityContext.addPrivateKeyForDID)(didDocument, compatibleSSI.getPrivateKey("raw"));
            await $$.promisify(securityContext.addPublicKeyForDID)(didDocument, compatibleSSI.getPublicKey("raw"));
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to save new private key and public key in security context`, e);
        }

        try {
            await $$.promisify(didDocument.addPublicKey)(compatibleSSI.getPublicKey("raw"));
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to save new private key and public key in security context`, e);
        }
    };

    target.encryptMessageImpl = function (privateKeys, receiverDIDDocument, message, callback) {
        const senderSeedSSI = keySSISpace.createTemplateSeedSSI(target.getDomain());
        senderSeedSSI.initialize(target.getDomain(), privateKeys[0]);

        receiverDIDDocument.getPublicKey("raw", async (err, receiverPublicKey) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get sender publicKey`, err));
            }

            const publicKeySSI = keySSISpace.createPublicKeySSI("seed", receiverPublicKey);

            const encryptMessage = (senderKeySSI) => {
                let encryptedMessage;
                try {
                    encryptedMessage = crypto.ecies_encrypt_ds(senderKeySSI, publicKeySSI, message);
                } catch (e) {
                    return callback(createOpenDSUErrorWrapper(`Failed to encrypt message`, e));
                }

                callback(undefined, encryptedMessage);
            }

            let compatibleSSI;
            try {
                compatibleSSI = await $$.promisify(publicKeySSI.generateCompatiblePowerfulKeySSI)();
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to create compatible seed ssi`, e));
            }

            try {
                await saveNewKeyPairInSC(target, compatibleSSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to save compatible seed ssi`, e));
            }

            encryptMessage(compatibleSSI);
        });
    };

    target.decryptMessageImpl = function (privateKeys, encryptedMessage, callback) {
        let decryptedMessageObj;
        const decryptMessageRecursively = (privateKeyIndex) => {
            const privateKey = privateKeys[privateKeyIndex];
            if (typeof privateKey === "undefined") {
                return callback(createOpenDSUErrorWrapper(`Failed to decrypt message`, Error(`Private key is undefined`)));
            }

            const receiverSeedSSI = keySSISpace.createTemplateSeedSSI(target.getDomain());
            receiverSeedSSI.initialize(target.getDomain(), privateKey);
            try {
                decryptedMessageObj = crypto.ecies_decrypt_ds(receiverSeedSSI, encryptedMessage);
            } catch (e) {
                return decryptMessageRecursively(privateKeyIndex + 1);
            }

            callback(undefined, decryptedMessageObj.message.toString());
        }

        decryptMessageRecursively(0);
    };

    /* messages to the APiHUb MQ compatible APIs

    * */

    target.getHash = () => {
        return crypto.sha256(target.getIdentifier());
    };

    target.sendMessage = function (message, toOtherDID, callback) {
        const mqHandler = require("opendsu").loadAPI("mq").getMQHandlerForDID(toOtherDID);
        target.encryptMessage(toOtherDID, message, (err, encryptedMessage) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to encrypt message`, err));
            }

            mqHandler.writeMessage(JSON.stringify(encryptedMessage), callback);
        });
    };

    target.readMessage = function (callback) {
        const mqHandler = require("opendsu").loadAPI("mq").getMQHandlerForDID(target);
        mqHandler.readMessage((err, encryptedMessage) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read message`, err));
            }

            let message;
            try {
                message = JSON.parse(encryptedMessage.message);
            } catch (e) {
              return callback(e);
            }
            target.decryptMessage(message, callback);
        });
    };

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

}

module.exports = W3CDID_Mixin;
