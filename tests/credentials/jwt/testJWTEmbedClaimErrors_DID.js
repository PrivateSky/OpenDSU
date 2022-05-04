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
const {createVc, JWT_ERRORS} = credentials;

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

assert.callback("[DID] Test JWT Embed public and subject claims errors", (callback) => {
    launchApiHubAndCreateDIDs((err, result) => {
        if (err) {
            throw err;
        }

        const jwtOptions = {exp: 1678812494957};
        const {issuerDidDocument, subjectDidDocument} = result;
        createVc("JWT", issuerDidDocument, subjectDidDocument, jwtOptions, (createJWTError, jwtInstance) => {
            if (createJWTError) {
                throw createJWTError;
            }

            jwtInstance.extendExpirationDate("invalidExpirationDate", (embedClaimError) => {
                assert.notNull(embedClaimError);
                assert.equal(embedClaimError, JWT_ERRORS.INVALID_EXPIRATION_DATE);

                jwtInstance.embedClaim("iss", subjectDidDocument, (embedClaimError) => {
                    assert.notNull(embedClaimError);
                    assert.equal(embedClaimError, JWT_ERRORS.IMMUTABLE_PUBLIC_CLAIM);

                    jwtInstance.embedClaim({invalidPublicClaim: true}, "test", (embedClaimError) => {
                        assert.notNull(embedClaimError);
                        assert.equal(embedClaimError, JWT_ERRORS.INVALID_PUBLIC_CLAIM);

                        jwtInstance.embedCredentialSubjectClaim("invalidContextURI", "TestSubjectClaim", {test: "test"}, (embedClaimError) => {
                            assert.notNull(embedClaimError);
                            assert.equal(embedClaimError, JWT_ERRORS.INVALID_CONTEXT_URI);

                            jwtInstance.embedCredentialSubjectClaim("https://some.uri.test", {invalidContextType: true}, {test: "test"}, (embedClaimError) => {
                                assert.notNull(embedClaimError);
                                assert.equal(embedClaimError, JWT_ERRORS.INVALID_CONTEXT_TYPE);

                                jwtInstance.embedCredentialSubjectClaim("https://some.uri.test", "TestSubjectClaim", "INVALID_SUBJECT_CLAIM", (embedClaimError) => {
                                    assert.notNull(embedClaimError);
                                    assert.equal(embedClaimError, JWT_ERRORS.INVALID_SUBJECT_CLAIM);

                                    jwtInstance.embedCredentialSubjectClaim("https://some.uri.test", "TestSubjectClaim", {id: issuerDidDocument}, (embedClaimError) => {
                                        assert.notNull(embedClaimError);
                                        assert.equal(embedClaimError, JWT_ERRORS.IMMUTABLE_SUBJECT_CLAIM);

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
}, 100000);