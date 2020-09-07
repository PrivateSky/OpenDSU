const cryptoRegistry = require("key-ssi-resolver").CryptoAlgorithmsRegistry;

const hash = (keySSI, data, callback) => {
    if (typeof data === "object" && !Buffer.isBuffer(data)) {
        data = JSON.stringify(data);
    }
    const hash = cryptoRegistry.getHashFunction(keySSI);
    callback(undefined, hash(data));
};

const encrypt = (keySSI, buffer, callback) => {
    const encrypt = cryptoRegistry.getEncryptionFunction(keySSI);
    callback(undefined, encrypt(buffer, keySSI.getEncryptionKey()));

};

const decrypt = (keySSI, encryptedBuffer, callback) => {
    const decrypt = cryptoRegistry.getDecryptionFunction(keySSI);
    let decryptedBuffer;
    try {
        decryptedBuffer = decrypt(encryptedBuffer, keySSI.getEncryptionKey());
    } catch (e) {
        return callback(e);
    }
    callback(undefined, decryptedBuffer);

};

const sign = (keySSI, hash, callback) => {
    const sign = cryptoRegistry.getSignFunction(keySSI);
    callback(undefined, sign(hash, keySSI.getEncryptionKey()));
};

const verifySignature = (keySSI, hash, signature, callback) => {
    const verify = cryptoRegistry.getVerifyFunction(keySSI);
    callback(undefined, verify(hash, keySSI.getEncryptionKey(), signature));
};

module.exports = {
    hash,
    encrypt,
    decrypt,
    sign,
    verifySignature
};
