const opendsu = require('opendsu');
const w3cDID = opendsu.loadAPI('w3cdid');
const scAPI = opendsu.loadAPI('sc');
const keySSIResolver = require('key-ssi-resolver');
const cryptoRegistry = keySSIResolver.CryptoAlgorithmsRegistry;
const SSITypes = keySSIResolver.SSITypes;
const keySSIFactory = keySSIResolver.KeySSIFactory;
const templateSeedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);
templateSeedSSI.load(SSITypes.SEED_SSI, 'default');

const {LABELS, JWT_ERRORS} = require('./constants');

function base58Decode(data, keepBuffer) {
    const decodedValue = cryptoRegistry.getDecodingFunction(templateSeedSSI).call(this, data);
    if (keepBuffer) {
        return decodedValue;
    }
    return decodedValue ? decodedValue.toString() : null;
}

function base64UrlEncode(source) {
    const buffer = $$.Buffer.from(source, 'utf-8');
    return buffer.toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function base64UrlDecode(source, keepAsBuffer = false) {
    const buffer = $$.Buffer.from(source, 'base64');
    if (keepAsBuffer) {
        return buffer;
    }

    return buffer.toString('utf-8');
}

function dateTimeFormatter(timestamp) {
    if (!timestamp) {
        return null;
    }

    return new Date(timestamp).toISOString().split('.')[0] + 'Z';
}

function isValidURL(str) {
    const pattern = new RegExp('https?:\\/\\/(www\\.)?[-a-zA-Z\d@:%._\\+~#=]{1,256}\\.[a-zA-Z\d()]{1,6}\\b([-a-zA-Z\d()@:%_\\+.~#?&//=]*)', 'i');
    return !!pattern.test(str);
}

/**
 * This method returns the readable format of an SSI or a DID
 * @param identity {string | Object} - The KeySSI instance | readable SSI string | DIDInstance | readable DID string
 */
function getReadableIdentity(identity) {
    if (!identity) return null;

    if (typeof identity === 'string' && (identity.indexOf('ssi') === 0 || identity.indexOf('did') === 0)) {
        // ssi/did is actually the readable ssi/did
        return identity;
    }

    identity = identity.hasOwnProperty('getIdentifier') ? identity.getIdentifier() : identity;
    if (identity.indexOf('did') === 0) {
        return identity;
    }

    let readableSSI = base58Decode(identity);
    if (!readableSSI) {
        // invalid base58 string
        return null;
    }
    if (readableSSI.indexOf('ssi') !== 0) {
        // invalid ssi format
        return null;
    }

    return readableSSI;
}

/**
 * This method is decoding a JSON string and returns the JSON object
 * @param data {string}
 * @param keepBuffer {boolean}
 * @returns {Object|Error}
 */
function safeParseEncodedJson(data, keepBuffer = false) {
    try {
        return JSON.parse(base64UrlDecode(data, keepBuffer));
    } catch (e) {
        return e;
    }
}

/**
 * This method decodes the JWT and returns the segments
 * @param jwt {string}
 * @param callback
 */
function parseJWTSegments(jwt, callback) {
    if (!jwt) return callback(JWT_ERRORS.EMPTY_JWT_PROVIDED);
    if (typeof jwt !== 'string') return callback(JWT_ERRORS.INVALID_JWT_FORMAT);

    const segments = jwt.split('.');
    if (segments.length !== 3) return callback(JWT_ERRORS.INVALID_JWT_FORMAT);

    const jwtHeader = safeParseEncodedJson(segments[0]);
    if (jwtHeader instanceof Error || !jwtHeader) return callback(JWT_ERRORS.INVALID_JWT_HEADER);

    const jwtPayload = safeParseEncodedJson(segments[1]);
    if (jwtPayload instanceof Error || !jwtPayload) return callback(JWT_ERRORS.INVALID_JWT_PAYLOAD);

    const encodedJWTHeaderAndBody = `${segments[0]}.${segments[1]}`;
    const jwtSignature = base64UrlDecode(segments[2], true);
    if (!jwtSignature) {
        return callback(JWT_ERRORS.INVALID_JWT_SIGNATURE);
    }

    callback(undefined, {jwtHeader, jwtPayload, jwtSignature, encodedJWTHeaderAndBody});
}

/**
 * This method provides the format of the issuer in order to be processed accordingly.
 * Allowed formats:
 * DID Identifier format
 * SSI format
 * @param issuer {string}
 * @returns {null | string}
 */
function getIssuerFormat(issuer) {
    if (!issuer) return null;

    if (issuer.indexOf('did') === 0) {
        return LABELS.ISSUER_DID;
    }

    if (issuer.indexOf('ssi') === 0) {
        return LABELS.ISSUER_SSI;
    }

    return null;
}

/**
 * This method provides the format of the subject in order to be processed accordingly.
 * Allowed formats:
 * DID Identifier format
 * sReadSSI format
 * @param subject {string}
 * @returns {null | string}
 */
function getSubjectFormat(subject) {
    if (!subject) return null;

    if (subject.indexOf('did') === 0) {
        return LABELS.SUBJECT_DID;
    }

    if (subject.indexOf('ssi') === 0) {
        return LABELS.SUBJECT_SSI;
    }

    return null;
}

/**
 * This method checks if a JWT is expired
 * @param payload {Object}
 * @param atDate
 * @returns {boolean}
 */
function isJWTExpired(payload, atDate) {
    const atDateTime = new Date(atDate).getTime(),
        expTime = new Date(payload.exp).getTime();
    let isExpired = expTime < atDateTime;
    if (payload.vc) {
        const expirationDateTime = new Date(payload.vc.expirationDate).getTime();
        if (expTime !== expirationDateTime) return false;
    }

    return isExpired;
}

/**
 * This method checks if a JWT is active
 * @param payload {Object}
 * @param atDate
 * @returns {boolean}
 */
function isJWTNotActive(payload, atDate) {
    const atDateTime = new Date(atDate).getTime(),
        nbfTime = new Date(payload.nbf).getTime();
    let isNotActive = nbfTime >= atDateTime;
    if (payload.vc) {
        const issuanceDateTime = new Date(payload.vc.issuanceDate).getTime();
        if (nbfTime !== issuanceDateTime) return false;
    }

    return isNotActive;
}

/**
 * This method is encrypting a string using asymmetric encryption, so only the pair of the DIDs can decrypt the message.
 * @param holder
 * @param verifier
 * @param dataToSign
 * @param callback
 */
function asymmetricalEncryption(holder, verifier, dataToSign, callback) {
    const issuerFormat = getIssuerFormat(holder);
    const audienceFormat = getSubjectFormat(verifier);
    if (issuerFormat !== LABELS.ISSUER_DID || audienceFormat !== LABELS.SUBJECT_DID) {
        return callback(JWT_ERRORS.HOLDER_AND_VERIFIER_MUST_BE_DID);
    }

    const securityContext = scAPI.getSecurityContext();
    const resolveDids = async () => {
        try {
            const holderDidDocument = await $$.promisify(w3cDID.resolveDID)(holder);
            const verifierDidDocument = await $$.promisify(w3cDID.resolveDID)(verifier);

            holderDidDocument.encryptMessage(verifierDidDocument, dataToSign, (err, encryptedData) => {
                if (err) {
                    return callback(err);
                }

                callback(undefined, base64UrlEncode(JSON.stringify(encryptedData)));
            });
        } catch (e) {
            return callback(e);
        }
    };

    if (securityContext.isInitialised()) {
        resolveDids();
    } else {
        securityContext.on('initialised', resolveDids);
    }
}

/**
 * Thi9s method is decrypting a JWT VC which was previously encrypted using asymmetric encryption.
 * @param verifier
 * @param encryptedData
 * @param callback
 */
function asymmetricalDecryption(verifier, encryptedData, callback) {
    const audienceFormat = getSubjectFormat(verifier);
    if (audienceFormat !== LABELS.SUBJECT_DID) {
        return callback(JWT_ERRORS.HOLDER_AND_VERIFIER_MUST_BE_DID);
    }

    const encryptedDataJSON = JSON.parse(base64UrlDecode(encryptedData));
    const securityContext = scAPI.getSecurityContext();
    const resolveDid = async () => {
        try {
            const verifierDidDocument = await $$.promisify(w3cDID.resolveDID)(verifier);
            verifierDidDocument.decryptMessage(encryptedDataJSON, (err, decryptedData) => {
                if (err) {
                    return callback(err);
                }

                callback(undefined, decryptedData);
            });
        } catch (e) {
            return callback(e);
        }
    };

    if (securityContext.isInitialised()) {
        resolveDid();
    } else {
        securityContext.on('initialised', resolveDid);
    }
}

/**
 * This method is validating recursively if the provided environmentDataClaims JSON object is part of jwtClaims JSON object
 * @param environmentDataClaims {Object} The object that must be part of jwtClaims object
 * @param jwtClaims {Object} The object that must contain all the properties from environmentDataClaims object
 * @returns {boolean}
 */
function validateClaims(environmentDataClaims, jwtClaims) {
    if(!environmentDataClaims) return true;

    const envDataClaimsKeys = Object.keys(environmentDataClaims);
    for (let index = 0; index < envDataClaimsKeys.length; ++index) {
        const key = envDataClaimsKeys[index],
            currentClaim = environmentDataClaims[key],
            currentJwtClaim = jwtClaims[key];
        if (typeof currentClaim === "object" && typeof currentJwtClaim === "object") {
            const areCurrentValidClaims = validateClaims(currentClaim, currentJwtClaim);
            if (!areCurrentValidClaims) {
                return false;
            }
        } else if (typeof currentClaim === "object" || typeof currentJwtClaim === "object") {
            return false;
        } else if (currentClaim !== currentJwtClaim) {
            return false;
        }
    }

    return true;
}

module.exports = {
    base64UrlEncode,
    dateTimeFormatter,
    isValidURL,

    getIssuerFormat,
    getSubjectFormat,
    isJWTExpired,
    isJWTNotActive,
    getReadableIdentity,
    parseJWTSegments,
    validateClaims,

    asymmetricalEncryption,
    asymmetricalDecryption
};