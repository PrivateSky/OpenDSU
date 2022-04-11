const {createJWT, resolveJWT, getReadableIdentity, parseJWTSegments, JWT_ERRORS} = require("./verifiableCredentials");
const {} = require("./verifiablePresentations");

module.exports = {
    createJWT,
    resolveJWT,

    getReadableIdentity,
    parseJWTSegments,

    JWT_ERRORS
};