const {JWT_DEFAULTS, JWT_ERRORS} = require('../constants');
const {defaultJWTParser, defaultJWTBuilder} = require('../jwt/model');
const utils = require('../utils');
const {verifyEncryptedCredential, verifyRootsOfTrust, verifyJWT} = require("../jwt/verify");

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

function jwtVpVerifier(decodedJWT, rootsOfTrust, callback) {
    const {jwtHeader, jwtPayload, jwtSignature} = decodedJWT;
    const dataToSign = [utils.base64UrlEncode(JSON.stringify(jwtHeader)), utils.base64UrlEncode(JSON.stringify(jwtPayload))].join('.');

    if (jwtPayload.aud) {
        return verifyEncryptedCredential(jwtPayload, callback);
    }

    if (rootsOfTrust.length > 0) {
        return verifyRootsOfTrust(jwtPayload, rootsOfTrust, callback);
    }

    verifyJWT(jwtPayload.iss, jwtSignature, dataToSign, {kid: jwtHeader.kid}, (err, verifyResult) => {
        if (err) return callback(err);
        if (!verifyResult) return callback(JWT_ERRORS.INVALID_JWT_SIGNATURE);

        callback(undefined, true);
    });
}

module.exports = {
    jwtVpBuilder, jwtVpParser, jwtVpVerifier
};