/*

encrypt(KeySSI, buffer, callback)
Return: After encryption the callback is called with an encrypted buffer
decrypt(KeySSI, encryptedBuffer, callback)
Return: After decryption the callback is called with the decrypted buffer
sign(KeySSI, hash, callback)
Return:  The callback is called with the signature/credential or an error. Typically the signature result is a JSON in the format specified in OpenDSU RFC 042 but the KeySSI could specify something else.
verifySignature(KeySSI, signature, callback)
Return:  The callback is called with an error or true for success
hash(KeySSI, JSONObject, callback)
Return:  The callback is called with applying the hash function specified in the type of the KeySSI  to the JSONObject packed accordingly with OpenDSU RFC 041

*/

const cryptoRegistry = require("key-ssi-resolver").CryptoAlgorithmsRegistry;

const hash = (keySSI, JSONObject, callback) => {
    const hash = cryptoRegistry.getHash(keySSI);
    callback(undefined, hash(JSON.stringify(JSONObject)));
}


const encrypt = (keySSI, buffer, callback) => {
    const encrypt = cryptoRegistry.getEncryption(keySSI);
    callback(undefined, encrypt(buffer, keySSI.getEncryptionKey()));

};

const decrypt = (keySSI, encryptedBuffer, callback) => {
    const decrypt = cryptoRegistry.getDecryption(keySSI);
    let decryptedBuffer;
    try {
        decryptedBuffer = decrypt(encryptedBuffer, keySSI.getEncryptionKey());
    } catch (e) {
        return callback(e);
    }
    callback(undefined, decryptedBuffer);

};

const __getPemFormattedKeyPair = (keySSI, callback) => {
    const keyGenerator = cryptoRegistry.getKeyPairGenerator(keySSI);
    let rawPublicKey;
    const rawPrivateKey = keySSI.getEncryptionKey();
    try {
        rawPublicKey = keyGenerator.getPublicKey(rawPrivateKey);
    } catch (e) {
        return callback(e);
    }

    let pemConvertedKeys;
    try {
        pemConvertedKeys = keyGenerator.convertKeys(rawPrivateKey, rawPublicKey);
    } catch (e) {
        return callback(e);
    }

    callback(undefined, pemConvertedKeys);
};

const sign = (keySSI, hash, callback) => {
    const sign = cryptoRegistry.getSign(keySSI);
    callback(undefined, sign(hash, sign.sign(hash, keySSI.getEncryptionKey())));
}

const verifySignature = (keySSI, signature, callback) => {
    const verify = cryptoRegistry.getVerify(keySSI);
    callback(undefined, verify.verify(keySSI.getEncryptionKey(), signature));
}

module.exports = {
    hash,
    encrypt,
    decrypt,
    sign,
    verifySignature
}
