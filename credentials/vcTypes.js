function JwtVcType() {
    const {createJWT, resolveJWT} = require("./jwt");

    this.create = (options, callback) => {
        const jwtInstance = createJWT(options);

        jwtInstance.on("error", (err) => {
            callback(err);
        });

        jwtInstance.on("initialised", () => {
            callback(undefined, jwtInstance);
        });
    };

    this.resolve = (encodedJWT, callback) => {
        const jwtInstance = resolveJWT(encodedJWT);

        jwtInstance.on("error", (err) => {
            callback(err);
        });

        jwtInstance.on("initialised", () => {
            callback(undefined, jwtInstance);
        });
    };
}

function PresentationType() {
    const {} = require("./presentations");

    this.create = (options, callback) => {
        console.log("Not implemented!");
        const instance = {}; // Create presentation

        instance.on("error", (err) => {
            callback(err);
        });

        instance.on("initialised", () => {
            callback(undefined, instance);
        });
    };

    this.resolve = (encodedPresentation, callback) => {
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

function createJwtVcType() {
    return new JwtVcType();
}

function createPresentationType() {
    return new PresentationType();
}

module.exports = {
    UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE: "UNKNOWN_VERIFIABLE_CREDENTIAL_TYPE",
    JWT: "jwt",
    PRESENTATION: "presentation",

    createJwtVcType,
    createPresentationType
};