const cryptoRegistry = require("key-ssi-resolver").CryptoAlgorithmsRegistry;

const hash = (keySSI, JSONObject, callback) => {
    const hash = cryptoRegistry.getHash(keySSI);
    callback(undefined, hash(JSON.stringify(JSONObject)));
};

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

const sign = (keySSI, hash, callback) => {
    const sign = cryptoRegistry.getSign(keySSI);
    callback(undefined, sign(hash, sign.sign(hash, keySSI.getEncryptionKey())));
};

const verifySignature = (keySSI, hash, signature, callback) => {
    const verify = cryptoRegistry.getVerify(keySSI);
    callback(undefined, verify.verify(hash, keySSI.getEncryptionKey(), signature));
};

module.exports = {
    hash,
    encrypt,
    decrypt,
    sign,
    verifySignature
};
