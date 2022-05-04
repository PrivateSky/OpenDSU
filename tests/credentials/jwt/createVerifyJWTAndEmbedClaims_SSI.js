require("../../../../../psknode/bundles/testsRuntime");

const assert = require("double-check").assert;
const keySSIResolver = require("key-ssi-resolver");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;

const openDSU = require("../../../index");
const keySSISpace = openDSU.loadApi("keyssi");
const credentials = openDSU.loadApi("credentials");
const crypto = openDSU.loadApi("crypto");
const {createVc, verifyVc} = credentials;

const templateSeedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);
templateSeedSSI.load(SSITypes.SEED_SSI, "default");

function initializeSeedSSIs(callback) {
    const subjectSeedSSI = keySSISpace.createTemplateSeedSSI("default");
    const issuerSeedSSI = keySSISpace.createTemplateSeedSSI("default");

    subjectSeedSSI.initialize("default", undefined, undefined, undefined, crypto.generateRandom(20).toString("hex"), (err) => {
        if (err) {
            return callback(err);
        }

        issuerSeedSSI.initialize("default", undefined, undefined, undefined, crypto.generateRandom(20).toString("hex"), (err) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, {issuerSeedSSI, subjectSeedSSI});
        });
    });
}

assert.callback("[DID] Create JWT, embed public and subject claims and verify JWT success test", (callback) => {
    initializeSeedSSIs((err, result) => {
        if (err) {
            throw err;
        }

        const {issuerSeedSSI, subjectSeedSSI} = result;
        const jwtOptions = {exp: 1678812494957};
        createVc("JWT", issuerSeedSSI, subjectSeedSSI, jwtOptions, (createJWTError, jwtInstance) => {
            if (createJWTError) {
                throw createJWTError;
            }

            jwtInstance.extendExpirationDate(6000, (embedClaimError, extendExpirationDateResult) => {
                if (embedClaimError) {
                    throw embedClaimError;
                }

                jwtInstance.embedClaim("nbf", Date.now(), (embedClaimError, embedExistingPublicClaimResult) => {
                    if (embedClaimError) {
                        throw embedClaimError;
                    }

                    jwtInstance.embedClaim("publicClaim", "test", (embedClaimError, embedNewPublicClaimResult) => {
                        if (embedClaimError) {
                            throw embedClaimError;
                        }

                        jwtInstance.embedCredentialSubjectClaim("https://some.uri.test", "TestSubjectClaim", {test: "test"}, (embedClaimError, embedCredentialSubjectClaimResult) => {
                            if (embedClaimError) {
                                throw embedClaimError;
                            }

                            jwtInstance.getEncodedJWT((err, encodedJWT) => {
                                if (err) {
                                    throw err;
                                }

                                verifyVc("JWT", encodedJWT, (err, verifiedJWTInstance) => {
                                    if (err) {
                                        throw err;
                                    }

                                    assert.notNull(verifiedJWTInstance);
                                    assert.true(extendExpirationDateResult);
                                    assert.true(embedExistingPublicClaimResult);
                                    assert.true(embedNewPublicClaimResult);
                                    assert.true(embedCredentialSubjectClaimResult);
                                    callback();
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
