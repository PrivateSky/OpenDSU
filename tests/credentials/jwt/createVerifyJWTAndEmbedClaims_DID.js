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
const {createVc, verifyVc} = credentials;

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
            console.error(err);
            throw err;
        }

        const jwtOptions = {
            exp: 1678812494957
        };
        const {issuerDidDocument, subjectDidDocument} = result;
        jwtOptions.issuer = issuerDidDocument;
        jwtOptions.subject = subjectDidDocument;
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
}, 100000);