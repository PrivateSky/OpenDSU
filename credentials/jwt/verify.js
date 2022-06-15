const opendsu = require('opendsu');
const w3cDID = opendsu.loadAPI('w3cdid');
const crypto = opendsu.loadAPI('crypto');
const keySSISpace = opendsu.loadApi('keyssi');
const keySSIResolver = require('key-ssi-resolver');
const cryptoRegistry = keySSIResolver.CryptoAlgorithmsRegistry;

const {JWT_ERRORS, LABELS} = require("../constants");
const {parseJWTSegments, loadEncryptedCredential, getIssuerFormat} = require("../utils");

/**
 * This method verifies the encrypted credentials using the private key of the audience. <br />
 * Only the intended audience can decrypt the encrypted credential to validate it.
 * @param jwtPayload
 * @param callback
 */
function verifyEncryptedCredential(jwtPayload, callback) {
    const verifyResult = { verifyResult: true, verifiableCredential: [] };
    const encryptedCredentials = jwtPayload.vp.verifiableCredential;
    const audience = jwtPayload.aud;
    if (!audience) {
        verifyResult.verifyResult = false;
        verifyResult.verifiableCredential.push({
            errorMessage: JWT_ERRORS.AUDIENCE_OF_PRESENTATION_NOT_DEFINED
        });

        return callback(undefined, verifyResult);
    }

    const chain = (index) => {
        if (index === encryptedCredentials.length) {
            return callback(undefined, verifyResult);
        }

        const encryptedCredential = encryptedCredentials[index];
        loadEncryptedCredential(audience, encryptedCredential, (err, decryptedJWTVc) => {
            if (err) {
                verifyResult.verifyResult = false;
                verifyResult.verifiableCredential.push({
                    jwtVc: encryptedCredential,
                    errorMessage: err
                });

                return chain(++index);
            }

            parseJWTSegments(decryptedJWTVc, (err, result) => {
                if (err) {
                    verifyResult.verifyResult = false;
                    verifyResult.verifiableCredential.push({
                        jwtVc: encryptedCredential,
                        errorMessage: err
                    });

                    return chain(++index);
                }

                verifyResult.verifiableCredential.push(result.jwtPayload);
                chain(++index);
            });
        });
    };

    chain(0);
}

/**
 * This method verifies if the roots of trust are the actual issuers of the verifiable credentials
 * @param jwtPayload
 * @param rootsOfTrust
 * @param callback
 */
function verifyRootsOfTrust(jwtPayload, rootsOfTrust, callback) {
    const jwtVcList = jwtPayload.vp.verifiableCredential;
    let verifyResult = { verifyResult: true, verifiableCredential: [] };

    const chain = (index) => {
        if (index === jwtVcList.length) {
            return callback(undefined, verifyResult);
        }

        const jwtVc = jwtVcList[index];
        parseJWTSegments(jwtVc, (err, result) => {
            if (err) {
                verifyResult.verifyResult = false;
                verifyResult.verifiableCredential.push({
                    jwtVc: jwtVc,
                    errorMessage: err
                });
                return chain(++index);
            }

            let jwtPayload = result.jwtPayload;
            const rootOfTrust = rootsOfTrust.find(r => r === jwtPayload.iss);
            if (!rootOfTrust) {
                verifyResult.verifyResult = false;
                verifyResult.verifiableCredential.push({
                    jwtVc: jwtVc,
                    errorMessage: JWT_ERRORS.ROOT_OF_TRUST_NOT_VALID
                });
                return chain(++index);
            }

            verifyResult.verifiableCredential.push(result.jwtPayload);
            chain(++index);
        });
    };

    chain(0);
}

/**
 * This method is verifying the encoded JWT from the current instance according to the issuerType
 * @param issuer
 * @param signature
 * @param signedData
 * @param callback {Function}
 */
function verifyJWT(issuer, signature, signedData, callback) {
    const issuerType = getIssuerFormat(issuer);
    switch (issuerType) {
        case LABELS.ISSUER_SSI: {
            return verifyUsingSSI(issuer, signature, signedData, callback);
        }

        case LABELS.ISSUER_DID: {
            return verifyUsingDID(issuer, signature, signedData, callback);
        }

        default: {
            callback(JWT_ERRORS.INVALID_ISSUER_FORMAT);
        }
    }
}

/**
 * This method is verifying an SSI signed JWT
 * @param issuer
 * @param signature
 * @param signedData
 * @param callback {Function}
 */
function verifyUsingSSI(issuer, signature, signedData, callback) {
    try {
        const issuerKeySSI = keySSISpace.parse(issuer);
        const publicKey = issuerKeySSI.getPublicKey();
        const hashFn = cryptoRegistry.getCryptoFunction(issuerKeySSI, 'hash');
        const hashResult = hashFn(signedData);

        const verify = cryptoRegistry.getVerifyFunction(issuerKeySSI);
        const verifyResult = verify(hashResult, publicKey, signature);
        callback(undefined, verifyResult);
    } catch (e) {
        return callback(e);
    }
}

/**
 * This method is verifying a DID signed JWT
 * @param issuer
 * @param signature
 * @param signedData
 * @param callback {Function}
 */
function verifyUsingDID(issuer, signature, signedData, callback) {
    w3cDID.resolveDID(issuer, (err, didDocument) => {
        if (err) {
            return callback(`Failed to resolve did ${issuer}`);
        }

        const hashResult = crypto.sha256(signedData);
        didDocument.verify(hashResult, signature, (verifyError, verifyResult) => {
            if (verifyError) {
                return callback(verifyError);
            }

            callback(null, verifyResult);
        });
    });
}

module.exports = {
    verifyJWT,
    verifyRootsOfTrust,
    verifyEncryptedCredential
};