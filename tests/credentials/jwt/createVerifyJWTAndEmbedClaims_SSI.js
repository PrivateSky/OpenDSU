require("../../../../../psknode/bundles/testsRuntime");

const assert = require("double-check").assert;
const keySSIResolver = require("key-ssi-resolver");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;

const openDSU = require("opendsu");
const keySSISpace = openDSU.loadApi("keyssi");
const credentials = openDSU.loadApi("credentials");

const templateSeedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);
templateSeedSSI.load(SSITypes.SEED_SSI, "default");

function initializeSeedSSIs(callback) {
    const subjectSeedSSI = keySSISpace.createTemplateSeedSSI("default");
    const issuerSeedSSI = keySSISpace.createTemplateSeedSSI("default");

    subjectSeedSSI.initialize("default", undefined, undefined, undefined, "subjectSeedSSIHint", (err) => {
        if (err) {
            return callback(err);
        }

        issuerSeedSSI.initialize("default", undefined, undefined, undefined, "issuerSeedSSIHint", (err) => {
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
        credentials.createJWTVerifiableCredential(issuerSeedSSI, subjectSeedSSI, jwtOptions, (createJWTError, jwtInstance) => {
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

                        jwtInstance.embedSubjectClaim("https://some.uri.test", "TestSubjectClaim", {test: "test"}, (embedClaimError, embedSubjectClaimResult) => {
                            if (embedClaimError) {
                                throw embedClaimError;
                            }

                            jwtInstance.getEncodedJWT((err, encodedJWT) => {
                                if (err) {
                                    throw err;
                                }

                                credentials.loadJWTVerifiableCredential(encodedJWT, (err, loadedJWTInstance) =>{
                                    if (err) {
                                        throw err;
                                    }

                                    loadedJWTInstance.verifyJWT(encodedJWT, (err, verificationStatus) => {
                                        if (err) {
                                            throw err;
                                        }

                                        assert.notNull(verificationStatus);
                                        assert.true(verificationStatus.verifyResult, verificationStatus.errorMessage);
                                        assert.true(extendExpirationDateResult);
                                        assert.true(embedExistingPublicClaimResult);
                                        assert.true(embedNewPublicClaimResult);
                                        assert.true(embedSubjectClaimResult);
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
});
