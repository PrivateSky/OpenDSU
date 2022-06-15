require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;
const tir = require("../../../../../psknode/tests/util/tir");

const openDSU = require("../../../index");
$$.__registerModule("opendsu", openDSU);
const w3cDID = openDSU.loadAPI("w3cdid");
const scAPI = openDSU.loadAPI("sc");
const credentials = openDSU.loadApi("credentials");
const domain = "default";

function launchApiHubAndCreateDIDs(callback) {
    dc.createTestFolder("JWTTest", async (err, folder) => {
        if (err) {
            return callback(err);
        }

        tir.launchApiHubTestNode(100, folder, async (err) => {
            if (err) {
                return callback(err);
            }

            scAPI.getSecurityContext().on("initialised", async () => {
                try {
                    const issuerDidDocument = await $$.promisify(w3cDID.createIdentity)('ssi:name', domain, "issuerPublicName");
                    const subjectDidDocument = await $$.promisify(w3cDID.createIdentity)('ssi:name', domain, "subjectPublicName");
                    callback(undefined, { issuerDidDocument, subjectDidDocument });
                } catch (e) {
                    callback(e);
                }
            });
        });
    });
}

assert.callback("[DID] Test verify JWT verifiable credential errors", (callback) => {
    launchApiHubAndCreateDIDs((err, result) => {
        if (err) {
            throw err;
        }

        const {issuerDidDocument, subjectDidDocument} = result;
        credentials.createJWTVerifiableCredential(issuerDidDocument, subjectDidDocument, (createJWTError, jwtInstance) => {
            if (createJWTError) {
                throw createJWTError;
            }

            jwtInstance.getEncodedJWT((err, encodedJWT) => {
                if (err) {
                    throw err;
                }

                credentials.createJWTVerifiablePresentation(subjectDidDocument, {credentialsToPresent: [encodedJWT]}, (err, presentationInstance) => {
                    if (err) {
                        throw err;
                    }

                    credentials.loadJWTVerifiableCredential(null, (emptyJWTError) => {
                        assert.notNull(emptyJWTError);
                        assert.equal(emptyJWTError, credentials.JWT_ERRORS.EMPTY_JWT_PROVIDED);

                        credentials.loadJWTVerifiableCredential({invalidJWTFormat: true}, (emptyJWTError) => {
                            assert.notNull(emptyJWTError);
                            assert.equal(emptyJWTError, credentials.JWT_ERRORS.INVALID_JWT_FORMAT);

                            credentials.loadJWTVerifiableCredential("invalidJWTFormat", (emptyJWTError) => {
                                assert.notNull(emptyJWTError);
                                assert.equal(emptyJWTError, credentials.JWT_ERRORS.INVALID_JWT_FORMAT);

                                credentials.loadJWTVerifiableCredential(encodedJWT, (err, loadedJWTInstance) => {
                                    if (err) {
                                        throw err;
                                    }

                                    loadedJWTInstance.verifyJWT(new Date("12-12-2021"), (err, verificationStatus1) => {
                                        assert.notNull(verificationStatus1);
                                        assert.equal(verificationStatus1.errorMessage, credentials.JWT_ERRORS.JWT_TOKEN_NOT_ACTIVE);

                                        loadedJWTInstance.verifyJWT(new Date("12-12-2023"), (err, verificationStatus2) => {
                                            assert.notNull(verificationStatus2);
                                            assert.equal(verificationStatus2.errorMessage, credentials.JWT_ERRORS.JWT_TOKEN_EXPIRED);

                                            const invalidJWTSignature = encodedJWT + "_invalidSignature";
                                            credentials.loadJWTVerifiableCredential(invalidJWTSignature, (err, loadedJWTInstance2) => {
                                                if (err) {
                                                    throw err;
                                                }

                                                loadedJWTInstance2.verifyJWT(Date.now(), (err, verificationStatus3) => {
                                                    assert.notNull(verificationStatus3);
                                                    assert.equal(verificationStatus3.errorMessage, credentials.JWT_ERRORS.INVALID_JWT_SIGNATURE);

                                                    presentationInstance.verifyJWT(Date.now(), ["invalid root of trust"], (err, jwtVpVerificationStatus) => {
                                                        if (err) {
                                                            throw err;
                                                        }

                                                        assert.notNull(jwtVpVerificationStatus);
                                                        assert.equal(jwtVpVerificationStatus.errorMessage, credentials.JWT_ERRORS.ROOT_OF_TRUST_NOT_VALID);

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
            });
        });
    });
}, 1000);