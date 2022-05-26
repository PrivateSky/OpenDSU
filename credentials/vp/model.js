const {JWT_DEFAULTS, JWT_ERRORS} = require("../constants");
const {defaultJWTParser, defaultJWTBuilder} = require("../jwt/model");
const {verifyJWT} = require("../jwt/verify");

/**
 * This method creates "vp" object from the payload of a JWT according to the W3c Standard
 * @param encodedJWTVc
 * @param jwtPayload
 * @param options {Object}
 */
function getRequiredJWTVPModel(encodedJWTVc, jwtPayload, options) {
    options = Object.assign({}, options, jwtPayload);
    let {vp, iss, id} = options; // can be extended with other attributes
    if (!vp) {
        vp = Object.assign({}, JWT_DEFAULTS.EMPTY_VC_VP);
    }

    return {
        "@context": [JWT_DEFAULTS.VC_VP_CONTEXT_CREDENTIALS, ...vp.context],
        type: [JWT_DEFAULTS.VP_TYPE, ...vp.type],
        id: id, // uuid of the presentation (optional)
        verifiableCredential: [encodedJWTVc],
        holder: iss // reflected from "iss" attribute
    }
}

function jwtVpBuilder(issuer, encodedJWTVc, options, callback) {
    defaultJWTBuilder(issuer, options, (err, result) => {
        if (err) {
            return callback(err);
        }

        const {jwtHeader, jwtPayload} = result;
        jwtPayload.vp = getRequiredJWTVPModel(encodedJWTVc, jwtPayload, options);

        callback(undefined, {jwtHeader, jwtPayload});
    });
}

function jwtVpParser(encodedJWTVp, atDate, callback) {
    defaultJWTParser(encodedJWTVp, atDate, (err, result) => {
        if (err) {
            return callback(err);
        }

        const {jwtHeader, jwtPayload, jwtSignature, encodedJWTHeaderAndBody} = result;
        if (!jwtPayload.vp) return callback(JWT_ERRORS.INVALID_JWT_PAYLOAD);
        verifyJWT(jwtPayload.iss, jwtSignature, encodedJWTHeaderAndBody, (err, verifyResult) => {
            if (err) return callback(err);
            if (!verifyResult) return callback(JWT_ERRORS.INVALID_JWT_SIGNATURE);

            callback(undefined, {jwtHeader, jwtPayload});
        });
    });
}

module.exports = {
    jwtVpBuilder, jwtVpParser
};