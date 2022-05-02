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
            console.error(err);
            throw err;
        }

        const {issuerSeedSSI, subjectSeedSSI} = result;
        const jwtOptions = {
            exp: 1678812494957
        };

        jwtOptions.issuer = issuerSeedSSI;
        jwtOptions.subject = subjectSeedSSI;
        createVc("JWT", jwtOptions, (createJWTError, jwtInstance) => {
            if (createJWTError) {
                console.error(createJWTError);
                throw createJWTError;
            }

            jwtInstance.extendExpirationDate(6000, (embedClaimError, embedResult) => {
                if (embedClaimError) {
                    console.error(embedClaimError);
                    throw embedClaimError;
                }

                assert.true(embedResult);

                jwtInstance.embedClaim({nbf: Date.now()}, (embedClaimError, embedResult) => {
                    if (embedClaimError) {
                        console.error(embedClaimError);
                        throw embedClaimError;
                    }

                    assert.true(embedResult);

                    jwtInstance.embedClaim({publicClaim: "test"}, (embedClaimError, embedResult) => {
                        if (embedClaimError) {
                            console.error(embedClaimError);
                            throw embedClaimError;
                        }

                        assert.true(embedResult);

                        jwtInstance.embedCredentialSubjectClaim({
                            context: "https://some.uri.test",
                            type: "TestSubjectClaim",
                            claims: {test: "test"}
                        }, (embedClaimError, embedResult) => {
                            if (embedClaimError) {
                                console.error(embedClaimError);
                                throw embedClaimError;
                            }

                            assert.true(embedResult);

                            const jwt = jwtInstance.getJWT();
                            verifyVc("JWT", jwt, (err, resolvedJWTInstance) => {
                                if (err) {
                                    console.error(err);
                                    throw err;
                                }

                                assert.notNull(resolvedJWTInstance);
                                callback();
                            });
                        });
                    });
                });
            });
        });
    });
});
