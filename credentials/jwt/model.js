const openDSU = require("opendsu");
const w3cDID = openDSU.loadAPI("w3cdid");
const crypto = openDSU.loadAPI("crypto");
const keySSISpace = openDSU.loadApi("keyssi");
const keySSIResolver = require("key-ssi-resolver");
const cryptoRegistry = keySSIResolver.CryptoAlgorithmsRegistry;

const {JWT_DEFAULTS, JWT_LABELS, JWT_ERRORS, getDefaultJWTOptions} = require("./constants");
const {dateTimeFormatter, encodeBase58, decodeBase58} = require("../utils");

/**
 * This method creates the header of a JWT according to the W3c Standard
 * @param options
 * @returns {{typ: string, alg: string}}
 */
function getRequiredJWTHeader(options) {
    const {alg, typ} = options; // can be extended with other attributes

    return {
        alg: alg || JWT_DEFAULTS.ALG,
        typ: typ || JWT_DEFAULTS.TYP
    }
}

/**
 * This method creates "vc" object from the payload of a JWT according to the W3c Standard
 * @param options {Object}
 * @returns {{credentialSubject: {id}, issuanceDate: string, type: *[], "@context": *[], issuer, expirationDate: string}}
 */
function getRequiredJWTVCModel(options) {
    let {vc, sub, iss, nbf, exp} = options; // can be extended with other attributes
    if (!vc) {
        vc = Object.assign({}, JWT_DEFAULTS.EMPTY_VC);
    }

    return {
        // id: jti reflected - not mandatory
        "@context": [JWT_DEFAULTS.VC_CONTEXT_CREDENTIALS, ...vc.context], // Mandatory and this must be the first URI from the list reference: https://www.w3.org/TR/vc-data-model/#contexts
        type: [JWT_DEFAULTS.VC_TYPE, ...vc.type], // Any other custom VC Types must be reflected within @context (a URI with a schema must be added)
        // Inside "credentialSubject" object are defined all the claims about the subject
        credentialSubject: {
            id: sub
        }, // Either single object, or an array of objects - id is mandatory and is reflected from "sub" attribute,
        issuer: iss, // reflected from "iss" attribute
        issuanceDate: dateTimeFormatter(nbf), // reflected from "nbf" attribute displayed using date-time format https://www.w3.org/TR/xmlschema11-2/#dateTime
        expirationDate: dateTimeFormatter(exp) // reflected from "exp" attribute displayed using date-time format https://www.w3.org/TR/xmlschema11-2/#dateTime
    }
}

/**
 * This method creates the payload of a JWT according to the W3c Standard
 * @param options {Object}
 * @returns {{sub, nbf, iss, exp, vc: {credentialSubject: {id}, issuanceDate: string, type: *[], "@context": *[], issuer, expirationDate: string}, iat}}
 */
function getRequiredJWTPayloadModel(options) {
    let {sub, iss, nbf, exp, iat} = options; // can be extended with other attributes

    // jti: Unique identifier; can be used to prevent the JWT from being replayed (allows a token to be used only once)
    return {
        vc: getRequiredJWTVCModel(options),
        sub: sub,
        iss: iss, // one of [URI of an issuer / DID identifier / { id: didIdentifier, name: .... }] | reference https://www.w3.org/TR/vc-data-model/#issuer
        nbf: nbf,
        exp: exp,
        iat: iat
    }
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
    if (issuer.indexOf("did") === 0) {
        return JWT_LABELS.ISSUER_DID;
    }

    if (issuer.indexOf("ssi") === 0) {
        return JWT_LABELS.ISSUER_SSI;
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
    if (subject.indexOf("did") === 0) {
        return JWT_LABELS.SUBJECT_DID;
    }

    if (subject.indexOf("ssi") === 0) {
        return JWT_LABELS.SUBJECT_SSI;
    }

    return null;
}

/**
 * This method creates the first signed JWT during a JWT instance initialisation
 * @param options
 * @param callback
 */
function jwtBuilder(options, callback) {
    options = Object.assign({}, getDefaultJWTOptions(), options);
    let issuer = options.issuer, subject = options.subject;
    issuer = getReadableIdentity(issuer);
    subject = getReadableIdentity(subject);

    if (!issuer) return callback(JWT_ERRORS.INVALID_ISSUER_FORMAT);
    if (!subject) return callback(JWT_ERRORS.INVALID_SUBJECT_FORMAT);

    const issuerFormat = getIssuerFormat(issuer);
    if (!issuerFormat) return callback(JWT_ERRORS.INVALID_ISSUER_FORMAT);

    const subjectFormat = getSubjectFormat(subject);
    if (!subjectFormat) return callback(JWT_ERRORS.INVALID_SUBJECT_FORMAT);

    options.iss = issuer;
    options.sub = subject;

    const jwtHeader = getRequiredJWTHeader(options);
    const jwtPayload = getRequiredJWTPayloadModel(options);

    const encodedJwtHeaderAndBody = [
        encodeBase58(JSON.stringify(jwtHeader)),
        encodeBase58(JSON.stringify(jwtPayload))
    ].join(".");

    signJWT(options.iss, encodedJwtHeaderAndBody, (err, signature) => {
        if (err) {
            return callback(err);
        }

        const encodedJWT = [encodedJwtHeaderAndBody, signature].join(".");
        callback(undefined, encodedJWT);
    });
}

/**
 * This method is signing the encoded header and payload of a JWT and returns the full signed JWT (header.payload.signature)
 * The JWT will be signed according to the type of the issuer (KeySSI, DID)
 * @param issuer
 * @param dataToSign
 * @param callback {Function}
 */
function signJWT(issuer, dataToSign, callback) {
    const issuerType = getIssuerFormat(issuer);
    switch (issuerType) {
        case JWT_LABELS.ISSUER_SSI: {
            return signUsingSSI(issuer, dataToSign, callback);
        }

        case JWT_LABELS.ISSUER_DID: {
            return signUsingDID(issuer, dataToSign, callback);
        }

        default: {
            return callback(JWT_ERRORS.INVALID_ISSUER_FORMAT);
        }
    }
}

/**
 * This method is signing a JWT using KeySSI
 * @param issuer
 * @param dataToSign
 * @param callback {Function}
 */
function signUsingSSI(issuer, dataToSign, callback) {
    try {
        const issuerKeySSI = keySSISpace.parse(issuer);
        const sign = cryptoRegistry.getSignFunction(issuerKeySSI);
        if (typeof sign !== "function") {
            return callback(new Error("Signing not available for " + issuerKeySSI.getIdentifier(true)));
        }

        const hashFn = cryptoRegistry.getCryptoFunction(issuerKeySSI, "hash");
        const hashResult = hashFn(dataToSign);
        const signResult = sign(hashResult, issuerKeySSI.getPrivateKey());
        const encodedSignResult = encodeBase58(signResult);
        callback(undefined, encodedSignResult);
    } catch (e) {
        return callback(e);
    }
}

/**
 * This method is signing a JWT using DID
 * @param issuer
 * @param dataToSign
 * @param callback {Function}
 */
function signUsingDID(issuer, dataToSign, callback) {
    w3cDID.resolveDID(issuer, (err, didDocument) => {
        if (err) {
            return callback(`Failed to resolve did ${issuer}`);
        }

        const hashResult = crypto.sha256(dataToSign);
        didDocument.sign(hashResult, (signError, signResult) => {
            if (signError || !signResult) return callback(signError);
            const encodedSignResult = encodeBase58(signResult);
            callback(undefined, encodedSignResult);
        });
    });
}

/**
 * @param header
 * @param payload
 * @param signature
 */
function jwtEncoder(header, payload, signature) {
    return [
        encodeBase58(JSON.stringify(header)),
        encodeBase58(JSON.stringify(payload)),
        encodeBase58(JSON.stringify(signature))
    ].join(".");
}

/**
 * This method returns the readable format of an SSI or a DID
 * @param identity {string | KeySSI | DIDDocument}
 */
function getReadableIdentity(identity) {
    if (typeof identity === "string" && (identity.indexOf("ssi") === 0 || identity.indexOf("did") === 0)) {
        // ssi/did is actually the readable ssi/did
        return identity;
    }

    identity = identity.getIdentifier ? identity.getIdentifier() : identity;
    if (identity.indexOf("did") === 0) {
        return identity;
    }

    let readableSSI = decodeBase58(identity);
    if (!readableSSI) {
        // invalid base58 string
        return null;
    }
    if (readableSSI.indexOf("ssi") !== 0) {
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
        return JSON.parse(decodeBase58(data, keepBuffer));
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
    if (typeof jwt !== "string") return callback(JWT_ERRORS.INVALID_JWT_FORMAT);

    const segments = jwt.split(".");
    if (segments.length !== 3) return callback(JWT_ERRORS.INVALID_JWT_FORMAT);

    const jwtHeader = safeParseEncodedJson(segments[0]);
    if (jwtHeader instanceof Error || !jwtHeader) return callback(JWT_ERRORS.INVALID_JWT_HEADER);

    const jwtPayload = safeParseEncodedJson(segments[1]);
    if (jwtPayload instanceof Error || !jwtPayload) return callback(JWT_ERRORS.INVALID_JWT_PAYLOAD);

    const encodedJwtHeaderAndBody = `${segments[0]}.${segments[1]}`;
    const jwtSignature = decodeBase58(segments[2], true);
    if (!jwtSignature) {
        return callback(JWT_ERRORS.INVALID_JWT_SIGNATURE);
    }

    callback(undefined, {jwtHeader, jwtPayload, jwtSignature, encodedJwtHeaderAndBody});
}

/**
 *
 * @param encodedJWT {string}
 * @param callback {Function}
 */
function jwtParser(encodedJWT, callback) {
    parseJWTSegments(encodedJWT, (err, result) => {
        if (err) {
            return callback(err);
        }

        const {jwtHeader, jwtPayload, jwtSignature, encodedJwtHeaderAndBody} = result;
        if (!jwtHeader.typ || !jwtHeader.alg) return callback(JWT_ERRORS.INVALID_JWT_HEADER);
        if (!jwtPayload.iss) return callback(JWT_ERRORS.INVALID_JWT_ISSUER);
        if (isJwtExpired(jwtPayload)) return callback(JWT_ERRORS.JWT_TOKEN_EXPIRED);
        if (isJwtNotActive(jwtPayload)) return callback(JWT_ERRORS.JWT_TOKEN_NOT_ACTIVE);
        if (!jwtPayload.vc) return callback(JWT_ERRORS.INVALID_JWT_PAYLOAD);

        verifyJWT(jwtPayload.iss, jwtSignature, encodedJwtHeaderAndBody, callback);
    });
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
        case JWT_LABELS.ISSUER_SSI: {
            return verifyUsingSSI(issuer, signature, signedData, callback);
        }

        case JWT_LABELS.ISSUER_DID: {
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
            if (verifyError || !verifyError) {
                return callback(JWT_ERRORS.INVALID_JWT_SIGNATURE);
            }

            callback(null, verifyResult);
        });
    });
}

/**
 * This method checks if a JWT is expired
 * @param payload {Object}
 * @returns {boolean}
 */
function isJwtExpired(payload) {
    return new Date(payload.exp * 1000) < new Date();
}

/**
 * This method checks if a JWT is active
 * @param payload {Object}
 * @returns {boolean}
 */
function isJwtNotActive(payload) {
    return new Date(payload.nbf * 1000) >= new Date();
}

module.exports = {
    jwtBuilder,
    jwtParser,
    getIssuerFormat,
    getSubjectFormat,
    jwtEncoder,
    getReadableIdentity,
    parseJWTSegments
};