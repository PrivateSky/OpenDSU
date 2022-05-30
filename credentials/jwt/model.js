const {JWT_DEFAULTS, JWT_ERRORS, getDefaultJWTOptions} = require("../constants");
const utils = require("../utils");

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
 * This method creates the payload of a JWT according to the W3c Standard
 * @param options {Object}
 * @returns {{sub, nbf, iss, exp, iat, aud, nonce}}
 */
function getRequiredJWTPayloadModel(options) {
    let {sub, iss, nbf, exp, iat, aud, jti, nonce} = options; // can be extended with other attributes

    // jti: Unique identifier; can be used to prevent the JWT from being replayed (allows a token to be used only once)
    return {
        sub, iss, nbf, exp, iat, aud, jti, nonce,
    }
}

/**
 * This method creates the first signed JWT during a JWT instance initialisation
 * @param issuer
 * @param options
 * @param callback
 */
function defaultJWTBuilder(issuer, options, callback) {
    options = Object.assign({}, getDefaultJWTOptions(), options);

    issuer = utils.getReadableIdentity(issuer);
    if (!issuer) return callback(JWT_ERRORS.INVALID_ISSUER_FORMAT);

    const issuerFormat = utils.getIssuerFormat(issuer);
    if (!issuerFormat) return callback(JWT_ERRORS.INVALID_ISSUER_FORMAT);

    options.iss = issuer;
    const jwtHeader = getRequiredJWTHeader(options);
    const jwtPayload = getRequiredJWTPayloadModel(options);

    callback(undefined, {jwtHeader, jwtPayload, options});
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

    const jwtHeader = utils.safeParseEncodedJson(segments[0]);
    if (jwtHeader instanceof Error || !jwtHeader) return callback(JWT_ERRORS.INVALID_JWT_HEADER);

    const jwtPayload = utils.safeParseEncodedJson(segments[1]);
    if (jwtPayload instanceof Error || !jwtPayload) return callback(JWT_ERRORS.INVALID_JWT_PAYLOAD);

    const encodedJWTHeaderAndBody = `${segments[0]}.${segments[1]}`;
    const jwtSignature = utils.base64UrlDecode(segments[2], true);
    if (!jwtSignature) {
        return callback(JWT_ERRORS.INVALID_JWT_SIGNATURE);
    }

    callback(undefined, {jwtHeader, jwtPayload, jwtSignature, encodedJWTHeaderAndBody});
}

/**
 *
 * @param encodedJWT {string}
 * @param callback {Function}
 */
function defaultJWTParser(encodedJWT, callback) {
    parseJWTSegments(encodedJWT, (err, result) => {
        if (err) {
            return callback(err);
        }

        const {jwtHeader, jwtPayload} = result;
        if (!jwtHeader.typ || !jwtHeader.alg) return callback(JWT_ERRORS.INVALID_JWT_HEADER);
        if (!jwtPayload.iss) return callback(JWT_ERRORS.INVALID_JWT_ISSUER);

        callback(undefined, result);
    });
}

module.exports = {
    defaultJWTBuilder, defaultJWTParser
};