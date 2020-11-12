const keySSIResolver = require("key-ssi-resolver");
const cryptoRegistry = keySSIResolver.CryptoAlgorithmsRegistry;
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;
const jwtUtils = require("./jwt");

const templateSeedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);
templateSeedSSI.load(SSITypes.SEED_SSI, "default");

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
    callback(undefined, sign(hash, keySSI.getPrivateKey()));
};

const verifySignature = (keySSI, hash, signature, publicKey, callback) => {
    if (typeof publicKey === "function") {
        callback = publicKey;
        publicKey = keySSI.getPublicKey();
    }
    const verify = cryptoRegistry.getVerifyFunction(keySSI);
    callback(undefined, verify(hash, publicKey, signature));
};

const generateEncryptionKey = (keySSI, callback) => {
    const generateEncryptionKey = cryptoRegistry.getEncryptionKeyGenerationFunction(keySSI);
    callback(undefined, generateEncryptionKey());
};

const encode = (keySSI, data) => {
    const encode = cryptoRegistry.getEncodingFunction(keySSI);
    return encode(data);
};

const decode = (keySSI, data) => {
    const decode = cryptoRegistry.getDecodingFunction(keySSI);
    return decode(data);
};

const sha256 = (dataObj) => {
    const pskcrypto = require("pskcrypto");
    const hashBuffer = pskcrypto.objectHash("sha256", dataObj);
    return pskcrypto.pskBase58Encode(hashBuffer);
};

const encodeBase58 = (data) => {
    return encode(templateSeedSSI, data);
};
const decodeBase58 = (data) => {
    return decode(templateSeedSSI, data);
};

const createJWT = (seedSSI, audience, credentials, options, callback) => {
    jwtUtils.createJWT(
        {
            seedSSI,
            audience,
            credentials,
            options,
            hash,
            encode: encodeBase58,
            sign,
        },
        callback
    );
};

const verifyJWT = (jwt, rootOfTrustVerificationStrategy, callback) => {
    jwtUtils.verifyJWT(
        {
            jwt,
            rootOfTrustVerificationStrategy,
            decode: decodeBase58,
            hash,
            verifySignature,
        },
        callback
    );
};

module.exports = {
    hash,
    encrypt,
    decrypt,
    sign,
    verifySignature,
    generateEncryptionKey,
    encode,
    decode,
    sha256,
    createJWT,
    verifyJWT,
    JWT_ERRORS: jwtUtils.JWT_ERRORS,
};
