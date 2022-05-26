const {createJWTVc, verifyJWTVc} = require("./vc/jwtVc");
const {createJWTVp, verifyJWTVp} = require("./vp/jwtVp");

function JWTProofType() {
    this.createVerifiableCredential = (issuer, subject, options, callback) => {
        if (typeof options === "function") {
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
    };

    this.verifyCredential = (encodedJWTVc, atDate, revocationStatus, callback) => {
        const jwtInstance = verifyJWTVc(encodedJWTVc, atDate, revocationStatus);
        jwtInstance.onInstanceReady((err) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, jwtInstance);
        });
    };

    this.createVerifiablePresentation = (issuer, encodedJWTVc, options, callback) => {
        if (typeof options === "function") {
            callback = options;
            options = {};
        }

        const jwtInstance = createJWTVp(issuer, encodedJWTVc, options);
        jwtInstance.onInstanceReady((err) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, jwtInstance);
        });
    };

    this.verifyPresentation = (encodedJWTVp, atDate, revocationStatus, callback) => {
        const jwtInstance = verifyJWTVp(encodedJWTVp, atDate, revocationStatus);
        jwtInstance.onInstanceReady((err) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, jwtInstance);
        });
    };
}

function createJWTProofType() {
    return new JWTProofType();
}

module.exports = {
    UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE: "UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE",
    JWT: "JWT",

    createJWTProofType
};