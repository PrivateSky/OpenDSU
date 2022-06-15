const {JWT_DEFAULTS, JWT_ERRORS, VALIDATION_STRATEGIES} = require('../constants');
const {defaultJWTParser, defaultJWTBuilder} = require('../jwt/model');
const {validatePresentation} = require('../validationStrategies');
const utils = require('../utils');

/**
 * This method creates "vp" object from the payload of a JWT according to the W3c Standard
 * @param jwtPayload
 * @param options {Object}
 */
function getRequiredJWTVPModel(jwtPayload, options) {
    options = Object.assign({}, options, jwtPayload);
    let {vp, iss, id} = options; // can be extended with other attributes
    if (!vp) {
        vp = Object.assign({}, JWT_DEFAULTS.EMPTY_VC_VP);
    }

    return {
        '@context': [JWT_DEFAULTS.VC_VP_CONTEXT_CREDENTIALS, ...vp.context],
        type: [JWT_DEFAULTS.VP_TYPE, ...vp.type],
        id: id, // uuid of the presentation (optional)
        verifiableCredential: options.credentialsToPresent || [],
        holder: iss // reflected from "iss" attribute
    };
}

function jwtVpBuilder(issuer, options, callback) {
    defaultJWTBuilder(issuer, options, (err, result) => {
        if (err) {
            return callback(err);
        }

        const {jwtHeader, jwtPayload} = result;
        jwtPayload.vp = getRequiredJWTVPModel(jwtPayload, options);

        callback(undefined, {jwtHeader, jwtPayload});
    });
}

function jwtVpParser(encodedJWTVp, callback) {
    defaultJWTParser(encodedJWTVp, (err, decodedJWT) => {
        if (err) {
            return callback(err);
        }

        if (!decodedJWT.jwtPayload.vp) return callback(JWT_ERRORS.INVALID_JWT_PAYLOAD);
        callback(undefined, decodedJWT);
    });
}

function jwtVpVerifier(decodedJWT, atDate, rootsOfTrust, callback) {
    const {jwtHeader, jwtPayload, jwtSignature} = decodedJWT;
    const dataToSign = [utils.base64UrlEncode(JSON.stringify(jwtHeader)), utils.base64UrlEncode(JSON.stringify(jwtPayload))].join('.');
    if (utils.isJWTExpired(jwtPayload, atDate)) return callback(JWT_ERRORS.JWT_TOKEN_EXPIRED);
    if (utils.isJWTNotActive(jwtPayload, atDate)) return callback(JWT_ERRORS.JWT_TOKEN_NOT_ACTIVE);

    if (jwtPayload.aud) {
        return validatePresentation(VALIDATION_STRATEGIES.ENCRYPTED_CREDENTIAL, jwtPayload, callback);
    }

    if (rootsOfTrust.length > 0) {
        return validatePresentation(VALIDATION_STRATEGIES.ROOTS_OF_TRUST, jwtPayload, rootsOfTrust, callback);
    }

    validatePresentation(VALIDATION_STRATEGIES.SIGNATURE, jwtPayload.iss, jwtSignature, dataToSign, (err, verifyResult) => {
        if (err) return callback(err);
        if (!verifyResult) return callback(JWT_ERRORS.INVALID_JWT_SIGNATURE);

        callback(undefined, true);
    });
}

module.exports = {
    jwtVpBuilder, jwtVpParser, jwtVpVerifier
};