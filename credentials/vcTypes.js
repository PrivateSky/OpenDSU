function JWTVcType() {
    const {createJWT, verifyJWT} = require("./jwt");

    this.create = (issuer, subject, options, callback) => {
        const jwtInstance = createJWT(issuer, subject, options);

        jwtInstance.onInstanceReady((err) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, jwtInstance);
        });
    };

    this.verify = (encodedJWT, callback) => {
        const jwtInstance = verifyJWT(encodedJWT);

        jwtInstance.onInstanceReady((err) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, jwtInstance);
        });
    };
}

function PresentationType() {
    const {} = require("./presentations");

    this.create = (issuer, subject, options, callback) => {
        console.log("Not implemented!");
        const instance = {}; // Create presentation

        instance.on("error", (err) => {
            callback(err);
        });

        instance.on("initialised", () => {
            callback(undefined, instance);
        });
    };

    this.verify = (encodedPresentation, callback) => {
        console.log("Not implemented!");
        const instance = {}; // Resolve presentation

        instance.on("error", (err) => {
            callback(err);
        });

        instance.on("initialised", () => {
            callback(undefined, instance);
        });
    };
}

function createJWTVcType() {
    return new JWTVcType();
}

function createPresentationType() {
    return new PresentationType();
}

module.exports = {
    UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE: "UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE",
    JWT: "JWT",
    PRESENTATION: "presentation",

    createJWTVcType,
    createPresentationType
};