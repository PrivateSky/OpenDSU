const keySSIResolver = require("key-ssi-resolver");
const crypto = require("pskcrypto");
const cryptoRegistry = keySSIResolver.CryptoAlgorithmsRegistry;
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;
const CryptoFunctionTypes = keySSIResolver.CryptoFunctionTypes;
const jwtUtils = require("./jwt");
const constants = require("../moduleConstants");
const config = require("./index");

const templateSeedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);
templateSeedSSI.load(SSITypes.SEED_SSI, "default");

const {JWT_ERRORS} = jwtUtils;

const getCryptoFunctionForKeySSI = (keySSI, cryptoFunctionType) => {
    return cryptoRegistry.getCryptoFunction(keySSI, cryptoFunctionType);
}
const hash = (keySSI, data, callback) => {
    console.log("This function is obsolete");
    callback(undefined, hashSync(keySSI, data));
};

const hashSync = (keySSI, data) => {
    console.log("This function is obsolete");
    if (typeof data === "object" && !$$.Buffer.isBuffer(data)) {
        data = JSON.stringify(data);
    }
    const hash = cryptoRegistry.getHashFunction(keySSI);
    return hash(data);
}

const encrypt = (data, encryptionKey) => {
    const pskEncryption = crypto.createPskEncryption("aes-256-gcm");
    return pskEncryption.encrypt(data, encryptionKey);
};

const decrypt = (data, encryptionKey) => {
    const pskEncryption = crypto.createPskEncryption("aes-256-gcm");
    return pskEncryption.decrypt(data, encryptionKey);
};

const ecies_encrypt_ds = (senderKeySSI, receiverKeySSI, data) => {
    const ecies_encrypt_ds = getCryptoFunctionForKeySSI(senderKeySSI, CryptoFunctionTypes.ECIES_ENCRYPTION_DS);
    return ecies_encrypt_ds(senderKeySSI.getKeyPair(), receiverKeySSI.getPublicKey("raw"), data);
};

const ecies_decrypt_ds = (receiverKeySSI, data) => {
    const ecies_decrypt_ds = getCryptoFunctionForKeySSI(receiverKeySSI, CryptoFunctionTypes.ECIES_DECRYPTION_DS);
    return ecies_decrypt_ds(receiverKeySSI.getPrivateKey(), data);
};

const deriveEncryptionKey = (password) => {
    return crypto.deriveKey(password);
}

const convertDerSignatureToASN1 = (derSignature) => {
    return require('pskcrypto').decodeDerToASN1ETH(derSignature);
};

const sign = (keySSI, data, callback) => {
    const sign = cryptoRegistry.getSignFunction(keySSI);
    if (typeof sign !== "function") {
        throw Error("Signing not available for " + keySSI.getIdentifier(true));
    } else {
        callback(undefined, sign(data, keySSI.getPrivateKey()));
    }
};

const verifySignature = (keySSI, data, signature, publicKey, callback) => {
    if (typeof publicKey === "function") {
        callback = publicKey;
        publicKey = keySSI.getPublicKey();
    }
    const verify = cryptoRegistry.getVerifyFunction(keySSI);
    callback(undefined, verify(data, publicKey, signature));
};

const generateEncryptionKey = (keySSI, callback) => {
    const generateEncryptionKey = cryptoRegistry.getEncryptionKeyGenerationFunction(keySSI);
    callback(undefined, generateEncryptionKey());
};

const encode = (keySSI, data) => {
    console.log("This function is obsolete");
    const encode = cryptoRegistry.getEncodingFunction(keySSI);
    return encode(data);
};

const decode = (keySSI, data) => {
    console.log("This function is obsolete");
    const decode = cryptoRegistry.getDecodingFunction(keySSI);
    return decode(data);
};

const sha256 = (dataObj) => {
    const pskcrypto = require("pskcrypto");
    const hashBuffer = pskcrypto.objectHash("sha256", dataObj);
    return pskcrypto.pskBase58Encode(hashBuffer);
};

const generateRandom = (length) => {
    const pskcrypto = require("pskcrypto");
    const randomBuffer = pskcrypto.randomBytes(length);
    return randomBuffer;
}

const encodeBase58 = (data) => {
    const encodeFn = getCryptoFunctionForKeySSI(templateSeedSSI, "encoding");
    return encodeFn(data);
};

const decodeBase58 = (data) => {
    const decodeFn = getCryptoFunctionForKeySSI(templateSeedSSI, "decoding");
    return decodeFn(data);
};


/**
 *
 * @param rawPublicKey
 * @param outputFormat - pem or der
 */
const convertPublicKey = (rawPublicKey, outputFormat, curveName) => {
    const ecGenerator = crypto.createKeyPairGenerator();
    return ecGenerator.convertPublicKey(rawPublicKey, {outputFormat, namedCurve: curveName});
};

/**
 *
 * @param rawPrivateKey
 * @param outputFormat - pem or der
 */
const convertPrivateKey = (rawPrivateKey, outputFormat) => {
    const ecGenerator = crypto.createKeyPairGenerator();
    return ecGenerator.convertPrivateKey(rawPrivateKey, {outputFormat});
}

const createJWT = (seedSSI, scope, credentials, options, callback) => {
    jwtUtils.createJWT(
        {
            seedSSI,
            scope,
            credentials,
            options,
            sign,
        },
        callback
    );
};

const createJWTForDID = (did, scope, credentials, options, callback) => {
    jwtUtils.createJWTForDID(
        {
            did,
            scope,
            credentials,
            options
        },
        callback
    );
};

const verifyJWT = (jwt, rootOfTrustVerificationStrategy, callback) => {
    jwtUtils.verifyJWT(
        {
            jwt,
            rootOfTrustVerificationStrategy,
            verifySignature,
        },
        callback
    );
};

const verifyDID_JWT = (jwt, rootOfTrustVerificationStrategy, callback) => {
    jwtUtils.verifyDID_JWT(
        {
            jwt,
            rootOfTrustVerificationStrategy
        },
        callback
    );
};

const createCredential = (issuerSeedSSI, credentialSubjectSReadSSI, callback) => {
    createJWT(issuerSeedSSI, "", null, {subject: credentialSubjectSReadSSI}, callback);
};

const createCredentialForDID = (did, credentialSubjectDID, callback) => {
    createJWTForDID(did, "", null, {subject: credentialSubjectDID}, callback);
};

const createAuthToken = (holderSeedSSI, scope, credential, callback) => {
    createJWT(holderSeedSSI, scope, credential, null, callback);
};

const createAuthTokenForDID = (holderDID, scope, credential, callback) => {
    createJWTForDID(holderDID, scope, credential, null, callback);
};

const createPresentationToken = (holderSeedSSI, scope, credential, callback) => {
    createJWT(holderSeedSSI, scope, credential, null, callback);
};

function verifyToken(jwt, listOfIssuers, verifyJWTFn, callback) {
    if (!listOfIssuers || !listOfIssuers.length) return callback(JWT_ERRORS.EMPTY_LIST_OF_ISSUERS_PROVIDED);

    // checks every credentials from the JWT's body to see if it has at least one JWT issues by one of listOfIssuers for the current subject
    const rootOfTrustVerificationStrategy = ({body}, verificationCallback) => {
        const {sub: subject, credentials} = body;
        // the JWT doesn't have credentials specified so we cannot check for valid authorizarion
        if (!credentials) return verificationCallback(null, false);

        const currentSubject = jwtUtils.getReadableIdentity(subject);

        const credentialVerifiers = credentials.map((credential) => {
            return new Promise((resolve) => {
                verifyJWTFn(
                    credential,
                    ({body}, credentialVerificationCallback) => {
                        // check if credential was issued for the JWT that we are verifying the authorization for
                        const credentialSubject = jwtUtils.getReadableIdentity(body.sub);
                        const isCredentialIssuedForSubject = !!credentialSubject && credentialSubject === currentSubject;
                        if (!isCredentialIssuedForSubject) return credentialVerificationCallback(null, false);

                        const credentialIssuer = jwtUtils.getReadableIdentity(body.iss);

                        // console.log(`Checking for credentialIssuer ${credentialIssuer} inside `, listOfIssuers);
                        // listOfIssuers.forEach(issuer => {
                        //     console.log(`Valid issuer ${issuer}: ${jwtUtils.getReadableSSI(issuer)}`);
                        // })

                        const isValidIssuer = listOfIssuers.some((issuer) => !!credentialIssuer
                            && jwtUtils.getReadableIdentity(issuer) === credentialIssuer);
                        credentialVerificationCallback(null, isValidIssuer);
                    },
                    (credentialVerifyError, isCredentialValid) => {
                        if (credentialVerifyError) return resolve(false);
                        resolve(isCredentialValid);
                    }
                );
            }).catch(() => {
                // is something went wrong, we deny the JWT
                return false;
            });
        });

        Promise.all(credentialVerifiers)
            .then((credentialVerifierResults) => {
                const hasAtLeastOneValidIssuer = credentialVerifierResults.some((result) => result);
                if (!hasAtLeastOneValidIssuer) return verificationCallback(null, false);
                verificationCallback(null, true);
            })
            .catch(() => {
                // is something went wrong, we deny the JWT
                verificationCallback(null, false);
            });
    };

    verifyJWTFn(jwt, rootOfTrustVerificationStrategy, callback);
}

const verifyAuthToken = (jwt, listOfIssuers, callback) => {
    verifyToken(jwt, listOfIssuers, verifyJWT, callback);
};

const verifyDIDAuthToken = (jwt, listOfIssuers, callback) => {
    verifyToken(jwt, listOfIssuers, verifyDID_JWT, callback);
};


function createBloomFilter(options) {
    const BloomFilter = require("psk-dbf");
    return new BloomFilter(options);
}

const sha256JOSE = (data, encoding) => {
    const pskCrypto = require("pskcrypto");
    return pskCrypto.hash("sha256", data, encoding);
}

const base64UrlEncodeJOSE = (data) => {
    if (typeof data === "string") {
        data = $$.Buffer.from(data);
    }
    return data.toString("base64").replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

module.exports = {
    getCryptoFunctionForKeySSI,
    hash,
    hashSync,
    generateRandom,
    encrypt,
    decrypt,
    sign,
    convertDerSignatureToASN1,
    verifySignature,
    generateEncryptionKey,
    encode,
    decode,
    encodeBase58,
    decodeBase58,
    sha256,
    createJWT,
    verifyJWT,
    createCredential,
    createAuthToken,
    verifyAuthToken,
    createPresentationToken,
    getReadableSSI: jwtUtils.getReadableIdentity,
    parseJWTSegments: jwtUtils.parseJWTSegments,
    createBloomFilter,
    JWT_ERRORS,
    deriveEncryptionKey,
    convertPrivateKey,
    convertPublicKey,
    ecies_encrypt_ds,
    ecies_decrypt_ds,
    createJWTForDID,
    verifyDID_JWT,
    verifyDIDAuthToken,
    createAuthTokenForDID,
    createCredentialForDID,
    base64UrlEncodeJOSE,
    sha256JOSE,
    joseAPI: require("pskcrypto").joseAPI
};
