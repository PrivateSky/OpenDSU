const jwt = require("./jwt");
const vcTypes = require("./vcTypes");
let vcTypeRegistry = {};

function createVc(type, options, callback) {
    if (!vcTypeRegistry[type]) {
        return callback(vcTypes.UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE);
    }

    vcTypeRegistry[type].create(options, callback);
}

function resolveVc(type, encodedVc, callback) {
    if (!vcTypeRegistry[type]) {
        return callback(vcTypes.UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE);
    }

    vcTypeRegistry[type].resolve(encodedVc, callback);
}

function registerCredentialTypes(method, implementation) {
    vcTypeRegistry[method] = implementation;
}

registerCredentialTypes(vcTypes.JWT, vcTypes.createJwtVcType());
registerCredentialTypes(vcTypes.PRESENTATION, vcTypes.createPresentationType());

module.exports = {
    createVc,
    resolveVc,

    jwt_getReadableIdentity: jwt.getReadableIdentity,
    jwt_parseJWTSegments: jwt.parseJWTSegments,
    JWT_ERRORS: jwt.JWT_ERRORS
};