const {JWT_DEFAULTS, JWT_ERRORS} = require("../jwt/constants");
const {dateTimeFormatter} = require("../utils");
const {defaultJWTParser, defaultJWTBuilder} = require("../jwt/model");
const {verifyJWT} = require("../jwt/verify");
const {getReadableIdentity, getIssuerFormat} = require("../jwt/jwtUtils");

/**
 * This method creates "vc" object from the payload of a JWT according to the W3c Standard
 * @param options {Object}
 * @returns {{credentialSubject: {id}, issuanceDate: string, type: *[], "@context": *[], issuer, expirationDate: string}}
 */
function getRequiredJWTVCModel(options) {
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
        issuanceDate: dateTimeFormatter(nbf), // reflected from "nbf" attribute displayed using date-time format https://www.w3.org/TR/xmlschema11-2/#dateTime
        expirationDate: dateTimeFormatter(exp) // reflected from "exp" attribute displayed using date-time format https://www.w3.org/TR/xmlschema11-2/#dateTime
    }
}

function jwtVcBuilder(issuer, subject, options, callback) {
    defaultJWTBuilder(issuer, options, (err, result) => {
        if (err) {
            return callback(err);
        }

        const {jwtHeader, jwtPayload} = result;
        subject = getReadableIdentity(subject);
        if (!subject) return callback(JWT_ERRORS.INVALID_SUBJECT_FORMAT);

        const subjectFormat = getIssuerFormat(subject);
        if (!subjectFormat) return callback(JWT_ERRORS.INVALID_SUBJECT_FORMAT);

        jwtPayload.sub = subject;
        options.sub = subject;
        jwtPayload.vc = getRequiredJWTVCModel(options);

        callback(undefined, {jwtHeader, jwtPayload});
    });
}

function jwtVcParser(encodedJWTVc, callback) {
    defaultJWTParser(encodedJWTVc, (err, result) => {
        if (err) {
            return callback(err);
        }

        const {jwtHeader, jwtPayload, jwtSignature, encodedJWTHeaderAndBody} = result;
        if (!jwtPayload.vc) return callback(JWT_ERRORS.INVALID_JWT_PAYLOAD);
        verifyJWT(jwtPayload.iss, jwtSignature, encodedJWTHeaderAndBody, (err, verifyResult) => {
            if (err) return callback(err);
            if (!verifyResult) return callback(JWT_ERRORS.INVALID_JWT_SIGNATURE);

            callback(undefined, {jwtHeader, jwtPayload});
        });
    });
}

module.exports = {
    jwtVcBuilder, jwtVcParser
};