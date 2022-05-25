const keySSIResolver = require("key-ssi-resolver");
const cryptoRegistry = keySSIResolver.CryptoAlgorithmsRegistry;
const SSITypes = keySSIResolver.SSITypes;
const keySSIFactory = keySSIResolver.KeySSIFactory;
const templateSeedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);
templateSeedSSI.load(SSITypes.SEED_SSI, "default");

const {LABELS} = require("./constants");

function base58Decode(data, keepBuffer) {
    const decodedValue = cryptoRegistry.getDecodingFunction(templateSeedSSI)(data);
    if (keepBuffer) {
        return decodedValue;
    }
    return decodedValue ? decodedValue.toString() : null;
}

function base64UrlEncode(source) {
    const buffer = $$.Buffer.from(source, 'utf-8');
    return buffer.toString('base64')
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}

function base64UrlDecode(source, keepAsBuffer = false) {
    const buffer = $$.Buffer.from(source, 'base64');
    if (keepAsBuffer) {
        return buffer;
    }

    return buffer.toString('utf-8')
        .replace(/-/g, "+")
        .replace(/_/g, "/");
}

function dateTimeFormatter(timestamp) {
    if (!timestamp) {
        return null;
    }

    return new Date(timestamp).toISOString().split(".")[0] + "Z";
}

function isValidURL(str) {
    const pattern = new RegExp("^(https?:\\/\\/)?" + // protocol
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
        "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
        "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
        "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
        "(\\#[-a-z\\d_]*)?$", "i"); // fragment locator
    return !!pattern.test(str);
}

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
        return LABELS.ISSUER_DID;
    }

    if (issuer.indexOf("ssi") === 0) {
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
    if (subject.indexOf("did") === 0) {
        return LABELS.SUBJECT_DID;
    }

    if (subject.indexOf("ssi") === 0) {
        return LABELS.SUBJECT_SSI;
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
    base64UrlEncode, base64UrlDecode, base58Decode,

    dateTimeFormatter, isValidURL,

    getIssuerFormat, getSubjectFormat, isJWTExpired, isJWTNotActive, getReadableIdentity, safeParseEncodedJson
};