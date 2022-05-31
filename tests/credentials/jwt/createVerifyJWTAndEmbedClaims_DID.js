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
            const jwtVcInstance = await credentials.createJWTVerifiableCredentialAsync(issuerDidDocument, subjectDidDocument, {exp: 1678812494957});

            const rootsOfTrust1 = [issuerDidDocument.getIdentifier()];
            const encodedJwtVc1 = await jwtVcInstance.getEncodedJWTAsync();
            const loadedJwtVcInstance1 = await credentials.loadJWTVerifiableCredentialAsync(encodedJwtVc1);
            const verificationStatus1 = await loadedJwtVcInstance1.verifyJWTAsync(Date.now(), rootsOfTrust1);
            // console.log("JWT Vc1: ", encodedJwtVc1);
            assert.notNull(loadedJwtVcInstance1, "Load Result should be a JWTVc Instance");
            assert.notNull(verificationStatus1, "Verify Result should be an object");
            assert.true(verificationStatus1.verifyResult, verificationStatus1.errorMessage);

            await jwtVcInstance.embedClaimAsync("nbf", Date.now());
            await jwtVcInstance.embedClaimAsync("scope", ["vc_sign", "vc_verify"]);
            await jwtVcInstance.extendExpirationDateAsync(6000);
            await jwtVcInstance.embedSubjectClaimAsync("https://some.uri.test", "TestSubjectClaim", {test: "test"});

            const rootsOfTrust2 = [issuerDidDocument.getIdentifier()];
            const encodedJwtVc2 = await jwtVcInstance.getEncodedJWTAsync();
            const loadedJwtVcInstance2 = await credentials.loadJWTVerifiableCredentialAsync(encodedJwtVc2);
            const verificationStatus2 = await loadedJwtVcInstance1.verifyJWTAsync(Date.now(), rootsOfTrust2);
            // console.log("JWT Vc2: ", encodedJwtVc2);
            assert.notNull(loadedJwtVcInstance2, "Load Result should be a JWTVc Instance");
            assert.notNull(verificationStatus2, "Verify Result should be an object");
            assert.true(verificationStatus2.verifyResult, verificationStatus2.errorMessage);

            const jwtVpInstance = await credentials.createJWTVerifiablePresentationAsync(issuerDidDocument, {exp: 1678812494957, credentialsToPresent: [encodedJwtVc2]});
            await jwtVpInstance.addVerifiableCredentialAsync(encodedJwtVc1);
            await jwtVpInstance.addVerifiableCredentialAsync(encodedJwtVc2);
            await jwtVpInstance.extendExpirationDateAsync(6000);
            await jwtVpInstance.embedClaimAsync("testClaim", "Claim");
            await jwtVpInstance.embedClaimAsync("nonce", "98ijs!%$1651");

            const rootsOfTrust = [issuerDidDocument.getIdentifier()];
            const encodedJwtVp = await jwtVpInstance.getEncodedJWTAsync();
            const loadedJWTVpInstance = await credentials.loadJWTVerifiablePresentationAsync(encodedJwtVp);
            const verificationStatus = await loadedJWTVpInstance.verifyJWTAsync(Date.now(), rootsOfTrust);
            // console.log("JWT VP: ", encodedJwtVp);
            assert.notNull(loadedJWTVpInstance, "Load Result should be a JWTVp Instance");
            assert.notNull(verificationStatus, "Verify Result should be an object");
            assert.true(verificationStatus.verifyResult, verificationStatus.errorMessage);
            callback();
        } catch (e) {
            throw e;
        }
    });
}, 1000);