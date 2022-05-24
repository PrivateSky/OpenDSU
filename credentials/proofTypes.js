const {createJWTVc, verifyJWTVc} = require("./vc/jwtVc");
const {createJWTVp, verifyJWTVp} = require("./vp/jwtVp");

function JWTProofType() {
    this.createVerifiableCredential = (issuer, subject, options, callback) => {
        const jwtInstance = createJWTVc(issuer, subject, options);

        jwtInstance.onInstanceReady((err) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, jwtInstance);
        });
    };

    this.verifyCredential = (encodedJWTVc, callback) => {
        const jwtInstance = verifyJWTVc(encodedJWTVc);

        jwtInstance.onInstanceReady((err) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, jwtInstance);
        });
    };

    this.createVerifiablePresentation = (issuer, encodedJWTVc, options, callback) => {
        const jwtInstance = createJWTVp(issuer, encodedJWTVc, options);

        jwtInstance.onInstanceReady((err) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, jwtInstance);
        });
    };

    this.verifyPresentation = (encodedJWTVp, callback) => {
        const jwtInstance = verifyJWTVp(encodedJWTVp);

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
    UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE: "UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE", JWT: "JWT",

    createJWTProofType
};