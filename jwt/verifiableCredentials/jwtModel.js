const {JWT_DEFAULTS, JWT_ERRORS, JWT_LABELS} = require("./jwtConstants");
const {dateTimeFormatter, encodeBase58} = require("./jwtUtils");

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
 * This method creates "vc" object from the payload of a JWT according to the W3c Standard
 * @param options {Object}
 * @returns {{credentialSubject: {id}, issuanceDate: string, type: *[], "@context": *[], issuer, expirationDate: string}}
 */
function getRequiredJWTVCModel(options) {
    let {vc, sub, iss, nbf, exp} = options; // can be extended with other attributes
    if (!vc) {
        vc = Object.assign({}, JWT_DEFAULTS.EMPTY_VC);
    }

    return {
        // id: jti reflected - not mandatory
        "@context": [JWT_DEFAULTS.VC_CONTEXT_CREDENTIALS, ...vc.context], // Mandatory and this must be the first URI from the list reference: https://www.w3.org/TR/vc-data-model/#contexts
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

/**
 * This method creates the payload of a JWT according to the W3c Standard
 * @param options {Object}
 * @returns {{sub, nbf, iss, exp, vc: {credentialSubject: {id}, issuanceDate: string, type: *[], "@context": *[], issuer, expirationDate: string}, iat}}
 */
function getRequiredJWTPayloadModel(options) {
    let {sub, iss, nbf, exp, iat} = options; // can be extended with other attributes

    // jti: Unique identifier; can be used to prevent the JWT from being replayed (allows a token to be used only once)
    return {
        vc: getRequiredJWTVCModel(options),
        sub: sub,
        iss: iss, // one of [URI of an issuer / DID identifier / { id: didIdentifier, name: .... }] | reference https://www.w3.org/TR/vc-data-model/#issuer
        nbf: nbf,
        exp: exp,
        iat: iat
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
 * This method prepares jwt header, payload and the encoded parts of them
 * @param jwtOptions {Object}
 * @returns {{jwtPayload: {sub: *, nbf: *, iss: *, exp: *, vc: {credentialSubject: {id: *}, issuanceDate: null|string, type, "@context", issuer: *, expirationDate: null|string}, iat: *}, jwtHeader: {typ, alg}, jwtEncodedSegments: *[]}}
 */
function prepareJWTSegments(jwtOptions) {
    const jwtHeader = getRequiredJWTHeader(jwtOptions);
    const jwtPayload = getRequiredJWTPayloadModel(jwtOptions);

    const jwtEncodedSegments = [encodeBase58(JSON.stringify(jwtHeader)), encodeBase58(JSON.stringify(jwtPayload))];
    return {jwtHeader, jwtPayload, jwtEncodedSegments};
}

/**
 * This method validates the issuer and subject format and using the provided options, creates the header, payload and the encoded parts that are ready to be signed
 * @param issuer
 * @param subject
 * @param options
 */
function jwtBuilder(issuer, subject, options) {
    const jwtOptions = {
        sub: subject, iss: issuer, ...options
    };

    const {jwtHeader, jwtPayload, jwtEncodedSegments} = prepareJWTSegments(jwtOptions);
    const encodedJwtHeaderAndBody = jwtEncodedSegments.join(".");
    return {
        jwtHeader,
        jwtPayload,
        encodedJwtHeaderAndBody
    }
}

module.exports = {
    getIssuerFormat,
    getSubjectFormat,
    jwtBuilder
};