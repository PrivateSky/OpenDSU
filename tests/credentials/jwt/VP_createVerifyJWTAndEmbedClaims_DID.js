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
const {createVerifiableCredential, createVerifiablePresentation, verifyPresentation} = credentials;

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
                    const domain = "default";
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

assert.callback("[DID] Create JWT, embed public claim and, another JWTVc and verify JWT success test", (callback) => {
    launchApiHubAndCreateDIDs((err, result) => {
        if (err) {
            throw err;
        }

        const jwtOptions = {exp: 1678812494957};
        const {issuerDidDocument, subjectDidDocument} = result;
        createVerifiableCredential("JWT", issuerDidDocument, subjectDidDocument, jwtOptions, async (createJwtVcError, jwtVcInstance) => {
            if (createJwtVcError) {
                throw createJwtVcError;
            }

            try {
                const encodedJwtVc1 = await jwtVcInstance.getEncodedJWTAsync();
                createVerifiablePresentation("JWT", issuerDidDocument, encodedJwtVc1, async (createJwtVpError, jwtVpInstance) => {
                    if (createJwtVpError) {
                        throw createJwtVpError;
                    }

                    await jwtVcInstance.embedClaimAsync("nbf", Date.now());
                    await jwtVcInstance.embedClaimAsync("testClaim", "Claim");
                    await jwtVcInstance.extendExpirationDateAsync(6000);
                    await jwtVcInstance.embedSubjectClaimAsync("https://some.uri.test", "TestSubjectClaim", {test: "test"});

                    const encodedJwtVc2 = await jwtVcInstance.getEncodedJWTAsync();

                    await jwtVpInstance.addVerifiableCredentialAsync(encodedJwtVc2);
                    await jwtVpInstance.extendExpirationDateAsync(6000);
                    await jwtVpInstance.embedClaimAsync("testClaim", "Claim");
                    await jwtVpInstance.embedClaimAsync("nonce", "98ijs1651");

                    const encodedJwtVp = await jwtVpInstance.getEncodedJWTAsync();

                    verifyPresentation("JWT", encodedJwtVp, (verifyJwtVpError, verifyJwtVpInstance) => {
                        if (verifyJwtVpError) {
                            throw verifyJwtVpError;
                        }

                        assert.notNull(verifyJwtVpInstance, "Verify Result should be a JWTVp Instance");
                        callback();
                    });
                });
            } catch (e) {
                throw e;
            }
        });
    });
}, 1000);