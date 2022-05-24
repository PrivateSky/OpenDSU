const {JWT_LABELS} = require("./constants");
const {base58Decode, base64UrlDecode} = require("../utils");

/**
 * This method returns the readable format of an SSI or a DID
 * @param identity {string | KeySSI | DIDDocument}
 */
function getReadableIdentity(identity) {
    if (!identity) return null;

    if (typeof identity === "string" && (identity.indexOf("ssi") === 0 || identity.indexOf("did") === 0)) {
        // ssi/did is actually the readable ssi/did
        return identity;
    }

    identity = identity.getIdentifier ? identity.getIdentifier() : identity;
    if (identity.indexOf("did") === 0) {
        return identity;
    }

    let readableSSI = base58Decode(identity);
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
        return JSON.parse(base64UrlDecode(data, keepBuffer));
    } catch (e) {
        return e;
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
 * This method checks if a JWT is expired
 * @param payload {Object}
 * @returns {boolean}
 */
function isJWTExpired(payload) {
    return new Date(payload.exp) < new Date();
}

/**
 * This method checks if a JWT is active
 * @param payload {Object}
 * @returns {boolean}
 */
function isJWTNotActive(payload) {
    return new Date(payload.nbf) >= new Date();
}

module.exports = {
    getIssuerFormat,
    getSubjectFormat,
    isJWTExpired,
    isJWTNotActive,
    getReadableIdentity,
    safeParseEncodedJson
};