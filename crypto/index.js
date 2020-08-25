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
const hash= (keySSI, JSONObject, callback) =>{
    const hash = keySSI.cryptoRegistry.getHash(keySSI.getVn());
    callback(undefined, hash(JSON.stringify(JSONObject)));
}


const encrypt = (keySSI, buffer, callback) => {
    const encrypt = keySSI.cryptoRegistry.getEncryption(keySSI.getVn());
    callback(undefined, encrypt(buffer, keySSI.getEncryptionKey()));

};

const decrypt = (keySSI, encryptedBuffer, callback) => {
    const decrypt = keySSI.cryptoRegistry.getDecryption(keySSI.getVn());
    let decryptedBuffer;
    try {
        decryptedBuffer = decrypt(encryptedBuffer, keySSI.getEncryptionKey());
    } catch (e) {
        return callback(e);
    }
    callback(undefined, decryptedBuffer);

};

const __getPemFormattedKeyPair = (keySSI, callback) => {
    const keyGenerator = keySSI.cryptoRegistry.getKeyPairGenerator(keySSI.getVn());
    let rawPublicKey;
    const rawPrivateKey = keySSI.getEncryptionKey();
    try {
        rawPublicKey = keyGenerator.getPublicKey(rawPrivateKey);
    }catch (e){
        return callback(e);
    }

    let pemConvertedKeys;
    try {
        pemConvertedKeys = keyGenerator.convertKeys(rawPrivateKey, rawPublicKey);
    } catch (e){
        return callback(e);
    }

    callback(undefined, pemConvertedKeys);
};

const sign = (keySSI, hash, callback)=>{
    __getPemFormattedKeyPair(keySSI, (err, pemConvertedKeys) => {
        if (err) {
            return callback(err);
        }
        const sign = keySSI.cryptoRegistry.getSign(keySSI.getVn());
        callback(undefined, sign(hash, sign.sign(hash, pemConvertedKeys.privateKey)));
    });
}

const verifySignature = (keySSI, signature, callback) => {
    __getPemFormattedKeyPair(keySSI, (err, pemConvertedKeys) => {
        if (err) {
            return callback(err);
        }
        const verify = keySSI.cryptoRegistry.getVerify(keySSI.getVn());
        callback(undefined, verify(hash, verify.sign(pemConvertedKeys.publicKey, signature)));
    });
}

module.exports = {
    hash,
    encrypt,
    decrypt,
    sign,
    verifySignature
}
