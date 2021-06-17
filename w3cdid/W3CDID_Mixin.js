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

    target.signImpl = (privateKey, data, callback) => {
        const keySSI = keySSISpace.createTemplateSeedSSI(target.getDomain());
        keySSI.initialize(keySSI.getDLDomain(), privateKey);
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

    target.encryptMessageImpl = function (privateKey, receiverDIDDocument, message, callback) {
        const senderSeedSSI = keySSISpace.createTemplateSeedSSI(target.getDomain());
        senderSeedSSI.initialize(target.getDomain(), privateKey);

        receiverDIDDocument.getPublicKey("raw", async (err, receiverPublicKey) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get sender publicKey`, err));
            }

            const publicKeySSI = keySSISpace.createPublicKeySSI(receiverDIDDocument.getDomain(), receiverPublicKey);
            let encryptedMessage;
            try {
                encryptedMessage = crypto.ecies_encrypt_ds(senderSeedSSI, publicKeySSI, message);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to encrypt message`, e));
            }

            callback(undefined, encryptedMessage);
        });
    };

    target.decryptMessageImpl = function (privateKey, encryptedMessage, callback) {
        const receiverSeedSSI = keySSISpace.createTemplateSeedSSI(target.getDomain());
        receiverSeedSSI.initialize(target.getDomain(), privateKey);
        let decryptedMessage;
        try {
            decryptedMessage = crypto.ecies_decrypt_ds(receiverSeedSSI, encryptedMessage);
        } catch (e) {
            return callback(createOpenDSUErrorWrapper(`Failed to decrypt message`, e));
        }

        callback(undefined, decryptedMessage);
    };

    /* messages to the APiHUb MQ compatible APIs

    * */
    target.sendMessage = function (message, toOtherDID, callback) {

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
