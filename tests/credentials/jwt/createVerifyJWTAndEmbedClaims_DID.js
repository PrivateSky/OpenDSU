require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;
const tir = require("../../../../../psknode/tests/util/tir");

const openDSU = require("../../../index");
$$.__registerModule("opendsu", openDSU);
const w3cDID = openDSU.loadAPI("w3cdid");
const scAPI = openDSU.loadAPI("sc");
const crypto = openDSU.loadApi("crypto");

const credentials = openDSU.loadApi("credentials");
const {createVerifiableCredential, verifyCredential} = credentials;

const domain = "default";

function launchApiHubAndCreateDIDs(callback) {
    dc.createTestFolder("JWT", async (err, folder) => {
        if (err) {
            return callback(err);
        }

        tir.launchApiHubTestNode(100, folder, async (err) => {
            if (err) {
                return callback(err);
            }

            scAPI.getSecurityContext().on("initialised", async () => {
                try {
                    const issuerDidDocument = await $$.promisify(w3cDID.createIdentity)("ssi:name", domain, crypto.generateRandom(20).toString("hex"));
                    const subjectDidDocument = await $$.promisify(w3cDID.createIdentity)("ssi:name", domain, crypto.generateRandom(20).toString("hex"));
                    callback(undefined, {issuerDidDocument, subjectDidDocument});
                } catch (e) {
                    callback(e);
                }
            });
        });
    });
}

assert.callback("[DID] Create JWT, embed public and subject claims and verify JWT success test", (callback) => {
    launchApiHubAndCreateDIDs((err, result) => {
        if (err) {
            throw err;
        }

        const jwtOptions = {exp: 1678812494957};
        const {issuerDidDocument, subjectDidDocument} = result;
        createVerifiableCredential("JWT", issuerDidDocument, subjectDidDocument, jwtOptions, (createJWTError, jwtInstance) => {
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

                                verifyCredential("JWT", encodedJWT, async (err, verifiedJWTInstance) => {
                                    if (err) {
                                        throw err;
                                    }

                                    assert.notNull(verifiedJWTInstance);
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
}, 1000);