require('../../../../../psknode/bundles/testsRuntime');

const dc = require('double-check');
const assert = dc.assert;
const tir = require('../../../../../psknode/tests/util/tir');

const openDSU = require('../../../index');
$$.__registerModule('opendsu', openDSU);
const w3cDID = openDSU.loadAPI('w3cdid');
const scAPI = openDSU.loadAPI('sc');
const credentials = openDSU.loadApi('credentials');

function launchApiHubAndCreateDIDs(callback) {
    dc.createTestFolder('JWTTest', async (err, folder) => {
        if (err) {
            return callback(err);
        }

        tir.launchApiHubTestNode(100, folder, async (err) => {
            if (err) {
                return callback(err);
            }

            scAPI.getSecurityContext().on('initialised', async () => {
                try {
                    const domain = 'default';
                    const issuerDidDocument = await $$.promisify(w3cDID.createIdentity)('ssi:name', domain, 'issuerPublicName');
                    const subjectDidDocument = await $$.promisify(w3cDID.createIdentity)('ssi:name', domain, 'subjectPublicName');
                    const audienceDidDocument = await $$.promisify(w3cDID.createIdentity)('ssi:name', domain, 'audiencePublicName');
                    callback(undefined, {issuerDidDocument, subjectDidDocument, audienceDidDocument});
                } catch (e) {
                    callback(e);
                }
            });
        });
    });
}

assert.callback('[DID] Create JWT, embed public claim and, another JWTVc and verify JWT success test', (callback) => {
    launchApiHubAndCreateDIDs(async (err, result) => {
        if (err) {
            throw err;
        }

        try {
            const {issuerDidDocument, subjectDidDocument} = result;
            const jwtVcInstance = await credentials.createJWTVerifiableCredentialAsync(issuerDidDocument, subjectDidDocument, {exp: 1678812494957});

            await jwtVcInstance.embedClaimAsync('nbf', Date.now());
            await jwtVcInstance.embedClaimAsync('scope', ['vc_sign', 'vc_verify']);
            await jwtVcInstance.extendExpirationDateAsync(6000);
            await jwtVcInstance.embedSubjectClaimAsync('https://some.uri.test', 'TestSubjectClaim', {test: 'test'});

            const encodedJwtVc = await jwtVcInstance.getEncodedJWTAsync();
            const loadedJwtVcInstance = await credentials.loadJWTVerifiableCredentialAsync(encodedJwtVc);
            const verificationStatusVC = await loadedJwtVcInstance.verifyJWTAsync();
            assert.notNull(loadedJwtVcInstance, 'Load Result should be a JWTVc Instance');
            assert.notNull(loadedJwtVcInstance, 'Verify Result should be an object');
            assert.true(verificationStatusVC.verifyResult, verificationStatusVC.errorMessage);

            const jwtVpInstance = await credentials.createJWTVerifiablePresentationAsync(subjectDidDocument, {
                exp: 1678812494957,
                credentialsToPresent: [encodedJwtVc]
            });
            await jwtVpInstance.extendExpirationDateAsync(6000);
            await jwtVpInstance.embedClaimAsync('testClaim', 'Claim');
            await jwtVpInstance.embedClaimAsync('nonce', '98ijs!%$1651');

            const rootsOfTrust = [issuerDidDocument.getIdentifier()];
            const encodedJwtVp = await jwtVpInstance.getEncodedJWTAsync();
            const loadedJWTVpInstance = await credentials.loadJWTVerifiablePresentationAsync(encodedJwtVp);
            const verificationStatus = await loadedJWTVpInstance.verifyJWTAsync();
            const verificationStatusWithRootsOfTrust = await loadedJWTVpInstance.verifyJWTAsync(rootsOfTrust);

            assert.notNull(loadedJWTVpInstance, 'Load Result should be a JWTVp Instance');
            assert.notNull(verificationStatus, 'Verify Result should be an object');
            assert.notNull(verificationStatusWithRootsOfTrust, 'Verify Result should be an object');
            assert.true(verificationStatus.verifyResult, verificationStatus.errorMessage);
            assert.true(verificationStatusWithRootsOfTrust.verifyResult, verificationStatusWithRootsOfTrust.errorMessage);

            const validationStrategies = credentials.validationStrategies;
            const {DEFAULT, ROOTS_OF_TRUST} = validationStrategies.VALIDATION_STRATEGIES;
            const environmentData = {
                atDate: new Date().getTime(),
                credentialPublicClaims: {sub: subjectDidDocument.getIdentifier()},
                subjectClaims: {test: 'test'},
                presentationPublicClaims: {nonce: '98ijs!%$1651', testClaim: 'Claim'},
                rootsOfTrust: [issuerDidDocument.getIdentifier()]
            };
            const validateVPDefault = await validationStrategies.validatePresentationAsync(DEFAULT, '', environmentData, JSON.parse(JSON.stringify(verificationStatus)));
            const validateVPRootsOfTrust = await validationStrategies.validatePresentationAsync(ROOTS_OF_TRUST, '', environmentData, JSON.parse(JSON.stringify(verificationStatus)));
            const validateVPDefaultAndRootsOfTrust = await validationStrategies.validatePresentationAsync([DEFAULT, ROOTS_OF_TRUST], '', environmentData, JSON.parse(JSON.stringify(verificationStatus)));

            assert.true(validateVPDefault, `Validation for DEFAULT strategy failed!`);
            assert.true(validateVPRootsOfTrust, `Validation for ROOTS_OF_TRUST strategy failed!`);
            assert.true(validateVPDefaultAndRootsOfTrust, `Validation for both DEFAULT and ROOTS_OF_TRUST strategies failed!`);

            callback();
        } catch (e) {
            console.error(e);
            throw e;
        }
    });
}, 1000);