const proofTypes = require("./proofTypes");
let proofTypesRegistry = {};

function createVerifiableCredential(proofType, issuer, subject, options, callback) {
    if (!proofTypesRegistry[proofType]) {
        return callback(proofTypes.UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE);
    }

    proofTypesRegistry[proofType].createVerifiableCredential(issuer, subject, options, callback);
}

function verifyCredential(proofType, encodedVc, callback) {
    if (!proofTypesRegistry[proofType]) {
        return callback(proofTypes.UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE);
    }

    proofTypesRegistry[proofType].verifyCredential(encodedVc, callback);
}

function createVerifiablePresentation(proofType, issuer, encodedVc, options, callback) {
    if (!proofTypesRegistry[proofType]) {
        return callback(proofTypes.UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE);
    }

    proofTypesRegistry[proofType].createVerifiablePresentation(issuer, encodedVc, options, callback);
}

function verifyPresentation(proofType, encodedVp, callback) {
    if (!proofTypesRegistry[proofType]) {
        return callback(proofTypes.UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE);
    }

    proofTypesRegistry[proofType].verifyPresentation(encodedVp, callback);
}

function registerCredentialEncodingTypes(method, implementation) {
    proofTypesRegistry[method] = implementation;
}

registerCredentialEncodingTypes(proofTypes.JWT, proofTypes.createJWTProofType());

module.exports = {
    createVerifiableCredential,
    verifyCredential,
    createVerifiablePresentation,
    verifyPresentation,

    JWT_ERRORS: require("./jwt/constants").JWT_ERRORS
};