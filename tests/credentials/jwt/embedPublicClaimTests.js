require("../../../../../psknode/bundles/testsRuntime");

const assert = require("double-check").assert;
const keySSIResolver = require("key-ssi-resolver");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;

const openDSU = require("../../../index");
const keySSISpace = openDSU.loadApi("keyssi");
const credentials = openDSU.loadApi("credentials");
const {createVc, JWT_ERRORS} = credentials;

const templateSeedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);
templateSeedSSI.load(SSITypes.SEED_SSI, "default");
const jwtOptions = {
    exp: 1678812494957
};

function initializeSeedSSIs(callback) {
    const subjectSeedSSI = keySSISpace.createTemplateSeedSSI("default");
    const issuerSeedSSI = keySSISpace.createTemplateSeedSSI("default");

    subjectSeedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
        if (err) {
            return callback(err);
        }

        issuerSeedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, {issuerSeedSSI, subjectSeedSSI});
        });
    });
}

assert.callback("Embed public claim with success test", (callback) => {
    initializeSeedSSIs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerSeedSSI, subjectSeedSSI} = result;
        jwtOptions.issuer = issuerSeedSSI;
        jwtOptions.subject = subjectSeedSSI;
        createVc("jwt", jwtOptions, (createJwtError, jwtInstance) => {
            if (createJwtError) {
                console.error(createJwtError);
                throw createJwtError;
            }

            jwtInstance.embedClaim({publicClaim: "test"}, (embedClaimError, embedResult) => {
                if (embedClaimError) {
                    console.error(embedClaimError);
                    throw embedClaimError;
                }

                assert.true(embedResult);
                callback();
            });
        });
    });
});

assert.callback("Update an existing public claim with success test", (callback) => {
    initializeSeedSSIs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerSeedSSI, subjectSeedSSI} = result;
        jwtOptions.issuer = issuerSeedSSI;
        jwtOptions.subject = subjectSeedSSI;
        createVc("jwt", jwtOptions, (createJwtError, jwtInstance) => {
            if (createJwtError) {
                console.error(createJwtError);
                throw createJwtError;
            }

            jwtInstance.embedClaim({nbf: Date.now()}, (embedClaimError, embedResult) => {
                if (embedClaimError) {
                    console.error(embedClaimError);
                    throw embedClaimError;
                }

                assert.true(embedResult);
                callback();
            });
        });
    });
});

assert.callback("Embed public claim with error test", (callback) => {
    initializeSeedSSIs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerSeedSSI, subjectSeedSSI} = result;
        jwtOptions.issuer = issuerSeedSSI;
        jwtOptions.subject = subjectSeedSSI;
        createVc("jwt", jwtOptions, (createJwtError, jwtInstance) => {
            if (createJwtError) {
                console.error(createJwtError);
                throw createJwtError;
            }

            jwtInstance.embedClaim("INVALID_CLAIM_OPTIONS", (embedClaimError) => {
                assert.notNull(embedClaimError);
                assert.equal(embedClaimError, JWT_ERRORS.INVALID_PUBLIC_CLAIM);
                callback();
            });
        });
    });
});

assert.callback("Update immutable claim with error test", (callback) => {
    initializeSeedSSIs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerSeedSSI, subjectSeedSSI} = result;
        jwtOptions.issuer = issuerSeedSSI;
        jwtOptions.subject = subjectSeedSSI;
        createVc("jwt", jwtOptions, (createJwtError, jwtInstance) => {
            if (createJwtError) {
                console.error(createJwtError);
                throw createJwtError;
            }

            jwtInstance.embedClaim({
                iss: "new issuer"
            }, (embedClaimError) => {
                assert.notNull(embedClaimError);
                assert.equal(embedClaimError, JWT_ERRORS.IMMUTABLE_PUBLIC_CLAIM);
                callback();
            });
        });
    });
});

assert.callback("Extend JWT expiration date test", (callback) => {
    initializeSeedSSIs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerSeedSSI, subjectSeedSSI} = result;
        jwtOptions.issuer = issuerSeedSSI;
        jwtOptions.subject = subjectSeedSSI;
        createVc("jwt", jwtOptions, (createJwtError, jwtInstance) => {
            if (createJwtError) {
                console.error(createJwtError);
                throw createJwtError;
            }

            jwtInstance.extendExpirationDate(6000, (embedClaimError, embedResult) => {
                if (embedClaimError) {
                    console.error(embedClaimError);
                    throw embedClaimError;
                }

                assert.true(embedResult);
                callback();
            });
        });
    });
});