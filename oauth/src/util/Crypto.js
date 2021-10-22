const openDSU = require("opendsu");
const crypto = openDSU.loadAPI("crypto");

function getRandomValues(len) {
    const buff = crypto.generateRandom(len);
    const str = crypto.base64UrlEncodeJOSE(buff);
    return str.substring(0, len);
}

function generateState() {
    return getRandomValues(32);
}

function generateCodeVerifier() {
    return getRandomValues(64);
}

function generateCodeChallenge(verifier) {
    return crypto.base64UrlEncodeJOSE(crypto.sha256JOSE(verifier));
}

function decodeBase64EncodedData(data) {
   return $$.Buffer.from(data, "base64").toString();
}

module.exports = {
    generateState,
    generateCodeVerifier,
    generateCodeChallenge,
    decodeBase64EncodedData
}