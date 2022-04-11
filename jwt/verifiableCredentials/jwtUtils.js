const keySSIResolver = require("key-ssi-resolver");
const {JWT_ERRORS} = require("./jwtConstants");
const cryptoRegistry = keySSIResolver.CryptoAlgorithmsRegistry;
const SSITypes = keySSIResolver.SSITypes;
const keySSIFactory = keySSIResolver.KeySSIFactory;

const templateSeedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);
templateSeedSSI.load(SSITypes.SEED_SSI, "default");

function encodeBase58(data) {
    return cryptoRegistry.getEncodingFunction(templateSeedSSI)(data).toString();
}

function decodeBase58(data, keepBuffer) {
    const decodedValue = cryptoRegistry.getDecodingFunction(templateSeedSSI)(data);
    if (keepBuffer) {
        return decodedValue;
    }

    return decodedValue ? decodedValue.toString() : null;
}

function dateTimeFormatter(timestamp) {
    if (!timestamp) {
        return null;
    }

    return new Date(timestamp).toISOString().split(".")[0] + "Z";
}

function nowEpochSeconds() {
    return Math.floor(new Date().getTime() / 1000);
}

/**
 * This method returns the readable format of an SSI or a DID
 * @param identity {string | KeySSI | DIDDocument}
 */
function getReadableIdentity(identity) {
    if (typeof identity === "string" && (identity.indexOf('ssi') === 0 || identity.indexOf('did') === 0)) {
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
        return JSON.parse(decodeBase58(data, keepBuffer));
    } catch (e) {
        return e;
    }
}

/**
 * This method decodes the JWT and returns the segments
 * @param jwt {string}
 * @param callback {Function}
 * @returns {*}
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
        // the signature couldn't be decoded due to an invalid signature
        return callback(JWT_ERRORS.INVALID_JWT_SIGNATURE);
    }

    callback(null, {jwtHeader, jwtPayload, jwtSignature, encodedJwtHeaderAndBody});
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

function isValidURL(str) {
    const pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    return !!pattern.test(str);
}

module.exports = {
    encodeBase58,
    decodeBase58,
    safeParseEncodedJson,
    parseJWTSegments,

    isJwtNotActive,
    isJwtExpired,
    getReadableIdentity,

    dateTimeFormatter,
    nowEpochSeconds,
    isValidURL
};