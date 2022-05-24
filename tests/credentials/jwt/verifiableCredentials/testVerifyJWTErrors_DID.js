require("../../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;
const tir = require("../../../../../../psknode/tests/util/tir");

const openDSU = require("../../../../index");
$$.__registerModule("opendsu", openDSU);
const w3cDID = openDSU.loadAPI("w3cdid");
const scAPI = openDSU.loadAPI("sc");
const crypto = openDSU.loadApi("crypto");

const credentials = openDSU.loadApi("credentials");
const {createVerifiableCredential, verifyCredential, JWT_ERRORS} = credentials;

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

assert.callback("[DID] Test verify JWT verifiable credential errors", (callback) => {
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

            jwtInstance.getEncodedJWT((err, encodedJWT) => {
                if (err) {
                    throw err;
                }

                const invalidJWTSignature = encodedJWT + "_invalidSignature";
                verifyCredential("JWT", invalidJWTSignature, (invalidSignatureError) => {
                    assert.notNull(invalidSignatureError);
                    assert.equal(invalidSignatureError, JWT_ERRORS.INVALID_JWT_SIGNATURE);

                    verifyCredential("JWT", null, (emptyJWTError) => {
                        assert.notNull(emptyJWTError);
                        assert.equal(emptyJWTError, JWT_ERRORS.EMPTY_JWT_PROVIDED);

                        verifyCredential("JWT", {invalidJWTFormat: true}, (emptyJWTError) => {
                            assert.notNull(emptyJWTError);
                            assert.equal(emptyJWTError, JWT_ERRORS.INVALID_JWT_FORMAT);

                            verifyCredential("JWT", "invalidJWTFormat", (emptyJWTError) => {
                                assert.notNull(emptyJWTError);
                                assert.equal(emptyJWTError, JWT_ERRORS.INVALID_JWT_FORMAT);

                                callback();
                            });
                        });
                    });
                });
            });
        });
    });
}, 1000);