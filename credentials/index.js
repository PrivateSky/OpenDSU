const {createJWTVc, loadJWTVc} = require('./vc/jwtVc');
const {createJWTVp, loadJWTVp} = require('./vp/jwtVp');
const validationStrategies = require("./validationStrategies");

function createJWTVerifiableCredential(issuer, subject, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    const jwtInstance = createJWTVc(issuer, subject, options);
    jwtInstance.onInstanceReady((err) => {
        if (err) {
            return callback(err);
        }

        callback(undefined, jwtInstance);
    });
}

async function createJWTVerifiableCredentialAsync(issuer, subject, options) {
    return $$.promisify(createJWTVerifiableCredential)(issuer, subject, options);
}

function loadJWTVerifiableCredential(encodedJWTVc, callback) {
    const jwtInstance = loadJWTVc(encodedJWTVc);
    jwtInstance.onInstanceReady((err) => {
        if (err) {
            return callback(err);
        }

        callback(undefined, jwtInstance);
    });
}

async function loadJWTVerifiableCredentialAsync(encodedJWTVc) {
    return $$.promisify(loadJWTVerifiableCredential)(encodedJWTVc);
}

function createJWTVerifiablePresentation(issuer, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    const jwtInstance = createJWTVp(issuer, options);
    jwtInstance.onInstanceReady((err) => {
        if (err) {
            return callback(err);
        }

        callback(undefined, jwtInstance);
    });
}

async function createJWTVerifiablePresentationAsync(issuer, options) {
    return $$.promisify(createJWTVerifiablePresentation)(issuer, options);
}

function loadJWTVerifiablePresentation(encodedJWTVp, callback) {
    const jwtInstance = loadJWTVp(encodedJWTVp);
    jwtInstance.onInstanceReady((err) => {
        if (err) {
            return callback(err);
        }

        callback(undefined, jwtInstance);
    });
}

async function loadJWTVerifiablePresentationAsync(encodedJWTVp) {
    return $$.promisify(loadJWTVerifiablePresentation)(encodedJWTVp);
}

module.exports = {
    createJWTVerifiableCredential,
    createJWTVerifiableCredentialAsync,
    createJWTVerifiablePresentation,
    createJWTVerifiablePresentationAsync,
    loadJWTVerifiableCredential,
    loadJWTVerifiableCredentialAsync,
    loadJWTVerifiablePresentation,
    loadJWTVerifiablePresentationAsync,
    validationStrategies,
    JWT_ERRORS: require('./constants').JWT_ERRORS
};