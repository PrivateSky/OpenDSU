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
const {createVerifiableCredentialAsync, createVerifiablePresentationAsync, verifyPresentationAsync} = credentials;

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
    launchApiHubAndCreateDIDs(async (err, result) => {
        if (err) {
            throw err;
        }

        try {
            const {issuerDidDocument, subjectDidDocument} = result;
            const jwtVcInstance = await createVerifiableCredentialAsync("JWT", issuerDidDocument, subjectDidDocument, {exp: 1678812494957});

            const encodedJwtVc1 = await jwtVcInstance.getEncodedJWTAsync();
            const jwtVpInstance = await createVerifiablePresentationAsync("JWT", issuerDidDocument, encodedJwtVc1, {exp: 1678812494957});

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

            const verifyJwtVpInstance = await verifyPresentationAsync("JWT", encodedJwtVp);
            console.log("JWT VP: ", encodedJwtVp);
            assert.notNull(verifyJwtVpInstance, "Verify Result should be a JWTVp Instance");
            callback();
        } catch (e) {
            throw e;
        }
    });
}, 1000);