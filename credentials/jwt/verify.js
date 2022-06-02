const openDSU = require("opendsu");
const w3cDID = openDSU.loadAPI("w3cdid");
const crypto = openDSU.loadAPI("crypto");
const keySSISpace = openDSU.loadApi("keyssi");
const keySSIResolver = require("key-ssi-resolver");
const cryptoRegistry = keySSIResolver.CryptoAlgorithmsRegistry;

const {LABELS, JWT_ERRORS} = require("../constants");
const {getIssuerFormat, parseJWTSegments} = require("../utils");

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
        const hashFn = cryptoRegistry.getCryptoFunction(issuerKeySSI, "hash");
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

/**
 * This method verifies if the roots of trust are the actual issuers of the verifiable credentials
 * @param jwtVcList
 * @param rootsOfTrust
 * @param callback
 */
function verifyRootsOfTrust(jwtVcList, rootsOfTrust, callback) {
    let verifyResult = {verifyResult: true, verifiableCredentials: []};
    const chain = (index) => {
        if (index === jwtVcList.length) {
            return callback(undefined, verifyResult);
        }

        const verifiableCredential = jwtVcList[index];
        parseJWTSegments(verifiableCredential, (err, result) => {
            if (err) {
                verifyResult.verifyResult = false;
                verifyResult.verifiableCredentials.push({
                    jwtVc: verifiableCredential,
                    errorMessage: err
                });
                return chain(++index);
            }

            let jwtPayload = result.jwtPayload;
            const rootOfTrust = rootsOfTrust.find(r => r === jwtPayload.iss);
            if (!rootOfTrust) {
                verifyResult.verifyResult = false;
                verifyResult.verifiableCredentials.push({
                    jwtVc: verifiableCredential,
                    errorMessage: JWT_ERRORS.ROOT_OF_TRUST_NOT_VALID + ": " + jwtPayload.iss
                });
                return chain(++index);
            }

            verifyResult.verifiableCredentials.push(result.jwtPayload);
            chain(++index);
        });
    };

    chain(0);
}

module.exports = {
    verifyJWT, verifyRootsOfTrust
};