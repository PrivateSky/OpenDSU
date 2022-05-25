const proofTypes = require("./proofTypes");
let proofTypesRegistry = {};

function createVerifiableCredential(proofType, issuer, subject, options, callback) {
    if (!proofTypesRegistry[proofType]) {
        return callback(proofTypes.UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE);
    }

    proofTypesRegistry[proofType].createVerifiableCredential(issuer, subject, options, callback);
}

async function createVerifiableCredentialAsync(proofType, issuer, subject, options) {
    return await $$.promisify(createVerifiableCredential)(proofType, issuer, subject, options);
}

function verifyCredential(proofType, encodedVc, callback) {
    if (!proofTypesRegistry[proofType]) {
        return callback(proofTypes.UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE);
    }

    proofTypesRegistry[proofType].verifyCredential(encodedVc, callback);
}

async function verifyCredentialAsync(proofType, encodedVc) {
    return await $$.promisify(verifyCredential)(proofType, encodedVc);
}

function createVerifiablePresentation(proofType, issuer, encodedVc, options, callback) {
    if (!proofTypesRegistry[proofType]) {
        return callback(proofTypes.UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE);
    }

    proofTypesRegistry[proofType].createVerifiablePresentation(issuer, encodedVc, options, callback);
}

async function createVerifiablePresentationAsync(proofType, issuer, encodedVc, options) {
    return await $$.promisify(createVerifiablePresentation)(proofType, issuer, encodedVc, options);
}

function verifyPresentation(proofType, encodedVp, callback) {
    if (!proofTypesRegistry[proofType]) {
        return callback(proofTypes.UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE);
    }

    proofTypesRegistry[proofType].verifyPresentation(encodedVp, callback);
}

async function verifyPresentationAsync(proofType, encodedVp) {
    return await $$.promisify(verifyPresentation)(proofType, encodedVp);
}

function registerCredentialEncodingTypes(method, implementation) {
    proofTypesRegistry[method] = implementation;
}

registerCredentialEncodingTypes(proofTypes.JWT, proofTypes.createJWTProofType());

module.exports = {
    createVerifiableCredential,
    createVerifiableCredentialAsync,
    verifyCredential,
    verifyCredentialAsync,
    createVerifiablePresentation,
    createVerifiablePresentationAsync,
    verifyPresentation,
    verifyPresentationAsync,

    JWT_ERRORS: require("./constants").JWT_ERRORS
};