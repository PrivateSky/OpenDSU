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

function verifyCredential(proofType, encodedVc, atDate, revocationStatus, callback) {
    if (!proofTypesRegistry[proofType]) {
        return callback(proofTypes.UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE);
    }

    if (typeof atDate === "function") {
        callback = atDate;
        atDate = Date.now();
    }

    if (!callback && typeof revocationStatus === "function") {
        callback = revocationStatus;
        revocationStatus = null;
    }

    proofTypesRegistry[proofType].verifyCredential(encodedVc, atDate, revocationStatus, callback);
}

async function verifyCredentialAsync(proofType, encodedVc, atDate, revocationStatus) {
    return await $$.promisify(verifyCredential)(proofType, encodedVc, atDate, revocationStatus);
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

function verifyPresentation(proofType, encodedVp, atDate, revocationStatus, callback) {
    if (!proofTypesRegistry[proofType]) {
        return callback(proofTypes.UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE);
    }

    if (typeof atDate === "function") {
        callback = atDate;
        atDate = Date.now();
    }

    if (!callback && typeof revocationStatus === "function") {
        callback = revocationStatus;
        revocationStatus = null;
    }

    proofTypesRegistry[proofType].verifyPresentation(encodedVp, atDate, revocationStatus, callback);
}

async function verifyPresentationAsync(proofType, encodedVp, atDate, revocationStatus) {
    return await $$.promisify(verifyPresentation)(proofType, encodedVp, atDate, revocationStatus);
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