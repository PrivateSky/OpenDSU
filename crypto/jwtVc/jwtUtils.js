const keySSIResolver = require("key-ssi-resolver");
const {JWT_LABELS} = require("./jwtConstants");
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

    // TODO: TBD if will keep this format for the moment
    return new Date(timestamp).toISOString().split(".")[0] + "Z";
}

function nowEpochSeconds() {
    return Math.floor(new Date().getTime() / 1000);
}

/**
 * This method is decoding a JSON string and returns the JSON object
 * @param data {string}
 * @param keepBuffer {boolean}
 * @returns {Object|Error}
 */
function safeParseEncodedJson(data, keepBuffer) {
    try {
        const result = JSON.parse(decodeBase58(data, keepBuffer));
        return result;
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
    if (issuer.indexOf("did:") === 0) {
        return JWT_LABELS.ISSUER_DID;
    }

    if (issuer.indexOf("ssi:") === 0) {
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
    if (subject.indexOf("did:") === 0) {
        return JWT_LABELS.SUBJECT_DID;
    }

    if (subject.indexOf("ssi:") === 0) {
        return JWT_LABELS.SUBJECT_SSI;
    }

    return null;
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
    encodeBase58,
    decodeBase58,
    safeParseEncodedJson,

    dateTimeFormatter,
    nowEpochSeconds,

    getIssuerFormat,
    getSubjectFormat,
    isJwtNotActive,
    isJwtExpired
};