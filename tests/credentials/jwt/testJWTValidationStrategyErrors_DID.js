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
                    callback(undefined, {issuerDidDocument, subjectDidDocument});
                } catch (e) {
                    callback(e);
                }
            });
        });
    });
}

assert.callback("[DID] Test JWT verifiable credential validation strategy possible errors", (callback) => {
    launchApiHubAndCreateDIDs(async (err, result) => {
        if (err) {
            throw err;
        }

        const {issuerDidDocument, subjectDidDocument} = result;
        const jwtVcInstance = await credentials.createJWTVerifiableCredentialAsync(issuerDidDocument, subjectDidDocument, {exp: 1678812494957});
        await jwtVcInstance.embedSubjectClaimAsync('https://some.uri.test', 'TestSubjectClaim', {test: 'test'});

        const encodedJwtVc = await jwtVcInstance.getEncodedJWTAsync();
        const jwtVpInstance = await credentials.createJWTVerifiablePresentationAsync(subjectDidDocument, {
            exp: 1678812494957,
            credentialsToPresent: [encodedJwtVc]
        });
        await jwtVpInstance.embedClaimAsync('testClaim', 'Claim');
        await jwtVpInstance.embedClaimAsync('nonce', '98ijs!%$1651');

        const rootsOfTrust = [issuerDidDocument.getIdentifier()];
        const encodedJwtVp = await jwtVpInstance.getEncodedJWTAsync();
        const loadedJWTVpInstance = await credentials.loadJWTVerifiablePresentationAsync(encodedJwtVp);
        const verificationStatus = await loadedJWTVpInstance.verifyJWTAsync(rootsOfTrust);

        assert.notNull(loadedJWTVpInstance, 'Load Result should be a JWTVp Instance');
        assert.notNull(verificationStatus, 'Verify Result should be an object');
        assert.true(verificationStatus.verifyResult, verificationStatus.errorMessage);

        const validationStrategies = credentials.validationStrategies;
        const {DEFAULT, ROOTS_OF_TRUST, INVALID_VALIDATION_STRATEGY} = validationStrategies.VALIDATION_STRATEGIES;

        let environmentData = {
            atDate: new Date().getTime(),
            rootsOfTrust: ["invalidRootOfTrust"]
        };
        try {
            await validationStrategies.validatePresentationAsync(ROOTS_OF_TRUST, environmentData, JSON.parse(JSON.stringify(verificationStatus)));
        } catch (e) {
            assert.equal(e, credentials.JWT_ERRORS.ROOT_OF_TRUST_NOT_VALID);
        }

        environmentData = {
            atDate: new Date().getTime(),
            credentialPublicClaims: {sub: subjectDidDocument.getIdentifier()},
            subjectClaims: {test: 'test'},
            presentationPublicClaims: {nonce: '98ijs!%$1651_invalid', testClaim: 'Claim'}
        };
        const validPresentationPublicClaim = await validationStrategies.validatePresentationAsync(DEFAULT, environmentData, JSON.parse(JSON.stringify(verificationStatus)));

        environmentData = {
            atDate: new Date().getTime(),
            credentialPublicClaims: {sub: subjectDidDocument.getIdentifier()},
            subjectClaims: {test: 'test_invalid'}
        };
        const validSubjectClaim = await validationStrategies.validatePresentationAsync(DEFAULT, environmentData, JSON.parse(JSON.stringify(verificationStatus)));

        environmentData = {
            atDate: new Date().getTime(),
            credentialPublicClaims: {sub: "invalidSubject"}
        };
        const validCredentialPublicClaim = await validationStrategies.validatePresentationAsync(DEFAULT, environmentData, JSON.parse(JSON.stringify(verificationStatus)));

        try {
            await validationStrategies.validatePresentationAsync("INVALID_VALIDATION_STRATEGY", environmentData, JSON.parse(JSON.stringify(verificationStatus)));
        } catch (e) {
            assert.equal(e, INVALID_VALIDATION_STRATEGY);
        }

        assert.true(!validPresentationPublicClaim, "This validation where presentationPublicClaims are invalid should be false");
        assert.true(!validSubjectClaim, "This validation where subjectClaims are invalid should be false");
        assert.true(!validCredentialPublicClaim, "This validation where credentialPublicClaims are invalid should be false");

        callback();
    });
}, 1000);