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
            const jwtVcInstance = await credentials.createVerifiableCredentialAsync("JWT", issuerDidDocument, subjectDidDocument, {exp: 1678812494957});

            const encodedJwtVc1 = await jwtVcInstance.getEncodedJWTAsync();
            const verifiedJwtVcInstance1 = await credentials.verifyCredentialAsync("JWT", encodedJwtVc1, Date.now(), null);
            console.log("JWT Vc1: ", encodedJwtVc1);
            assert.notNull(verifiedJwtVcInstance1, "Verify Result should be a JWTVc Instance");

            const jwtVpInstance = await credentials.createVerifiablePresentationAsync("JWT", issuerDidDocument, encodedJwtVc1, {exp: 1678812494957});

            await jwtVcInstance.embedClaimAsync("nbf", Date.now());
            await jwtVcInstance.embedClaimAsync("scope", ["vc_sign", "vc_verify"]);
            await jwtVcInstance.extendExpirationDateAsync(6000);
            await jwtVcInstance.embedSubjectClaimAsync("https://some.uri.test", "TestSubjectClaim", {test: "test"});

            const encodedJwtVc2 = await jwtVcInstance.getEncodedJWTAsync();
            const verifiedJwtVcInstance2 = await credentials.verifyCredentialAsync("JWT", encodedJwtVc2, Date.now(), null);
            console.log("JWT Vc2: ", encodedJwtVc2);
            assert.notNull(verifiedJwtVcInstance2, "Verify Result should be a JWTVc Instance");

            await jwtVpInstance.addVerifiableCredentialAsync(encodedJwtVc2);
            await jwtVpInstance.extendExpirationDateAsync(6000);
            await jwtVpInstance.embedClaimAsync("testClaim", "Claim");
            await jwtVpInstance.embedClaimAsync("nonce", "98ijs!%$1651");

            const encodedJwtVp = await jwtVpInstance.getEncodedJWTAsync();

            const verifiedJwtVpInstance = await credentials.verifyPresentationAsync("JWT", encodedJwtVp, Date.now(), null);
            console.log("JWT VP: ", encodedJwtVp);
            assert.notNull(verifiedJwtVpInstance, "Verify Result should be a JWTVp Instance");
            callback();
        } catch (e) {
            throw e;
        }
    });
}, 1000);