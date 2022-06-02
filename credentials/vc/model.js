const {JWT_DEFAULTS, JWT_ERRORS} = require("../constants");
const {defaultJWTParser, defaultJWTBuilder} = require("../jwt/model");
const {verifyJWT} = require("../jwt/verify");
const utils = require("../utils");
const {base64UrlEncode} = require("../utils");

/**
 * This method creates "vc" object from the payload of a JWT according to the W3c Standard
 * @param jwtPayload
 * @param options {Object}
 * @returns {{credentialSubject: {id}, issuanceDate: string, type: *[], "@context": *[], issuer, expirationDate: string}}
 */
function getRequiredJWTVCModel(jwtPayload, options) {
    options = Object.assign({}, options, jwtPayload);
    let {vc, sub, iss, nbf, exp} = options; // can be extended with other attributes
    if (!vc) {
        vc = Object.assign({}, JWT_DEFAULTS.EMPTY_VC_VP);
    }

    return {
        // id: jti reflected - not mandatory
        "@context": [JWT_DEFAULTS.VC_VP_CONTEXT_CREDENTIALS, ...vc.context], // Mandatory and this must be the first URI from the list reference: https://www.w3.org/TR/vc-data-model/#contexts
        type: [JWT_DEFAULTS.VC_TYPE, ...vc.type], // Any other custom VC Types must be reflected within @context (a URI with a schema must be added)
        // Inside "credentialSubject" object are defined all the claims about the subject
        credentialSubject: {
            id: sub
        }, // Either single object, or an array of objects - id is mandatory and is reflected from "sub" attribute,
        issuer: iss, // reflected from "iss" attribute
        issuanceDate: utils.dateTimeFormatter(nbf), // reflected from "nbf" attribute displayed using date-time format https://www.w3.org/TR/xmlschema11-2/#dateTime
        expirationDate: utils.dateTimeFormatter(exp) // reflected from "exp" attribute displayed using date-time format https://www.w3.org/TR/xmlschema11-2/#dateTime
    }
}

function jwtVcBuilder(issuer, subject, options, callback) {
    defaultJWTBuilder(issuer, options, (err, result) => {
        if (err) {
            return callback(err);
        }

        const {jwtHeader, jwtPayload} = result;
        subject = utils.getReadableIdentity(subject);
        if (!subject) return callback(JWT_ERRORS.INVALID_SUBJECT_FORMAT);

        const subjectFormat = utils.getIssuerFormat(subject);
        if (!subjectFormat) return callback(JWT_ERRORS.INVALID_SUBJECT_FORMAT);

        jwtPayload.sub = subject;
        options.sub = subject;
        jwtPayload.vc = getRequiredJWTVCModel(jwtPayload, options);

        callback(undefined, {jwtHeader, jwtPayload});
    });
}

function jwtVcParser(encodedJWTVc, callback) {
    defaultJWTParser(encodedJWTVc, (err, decodedJWT) => {
        if (err) {
            return callback(err);
        }

        if (!decodedJWT.jwtPayload.vc) return callback(JWT_ERRORS.INVALID_JWT_PAYLOAD);
        callback(undefined, decodedJWT);
    });
}

function jwtVcVerifier(decodedJWT, atDate, rootsOfTrust, callback) {
    const {jwtHeader, jwtPayload, jwtSignature} = decodedJWT;
    const dataToSign = [base64UrlEncode(JSON.stringify(jwtHeader)), base64UrlEncode(JSON.stringify(jwtPayload))].join(".");
    if (utils.isJWTExpired(jwtPayload, atDate)) return callback(JWT_ERRORS.JWT_TOKEN_EXPIRED);
    if (utils.isJWTNotActive(jwtPayload, atDate)) return callback(JWT_ERRORS.JWT_TOKEN_NOT_ACTIVE);
    verifyJWT(jwtPayload.iss, jwtSignature, dataToSign, (err, verifyResult) => {
        if (err) return callback(err);
        if (!verifyResult) return callback(JWT_ERRORS.INVALID_JWT_SIGNATURE);

        callback(undefined, true);
    });
}

module.exports = {
    jwtVcBuilder, jwtVcParser, jwtVcVerifier
};