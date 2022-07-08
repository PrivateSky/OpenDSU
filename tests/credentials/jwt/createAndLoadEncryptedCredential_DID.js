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
                    const issuerDidDocument = await $$.promisify(w3cDID.createIdentity)('ssi:name', domain, "issuerPublicName");
                    const subjectDidDocument = await $$.promisify(w3cDID.createIdentity)('ssi:name', domain, "subjectPublicName");
                    const audienceDidDocument = await $$.promisify(w3cDID.createIdentity)('ssi:name', domain, "audiencePublicName");
                    callback(undefined, {issuerDidDocument, subjectDidDocument, audienceDidDocument});
                } catch (e) {
                    callback(e);
                }
            });
        });
    });
}

assert.callback('[DID] Create JWT VC and VP with encrypted credential credential embedded into presentation', (callback) => {
    launchApiHubAndCreateDIDs(async (err, result) => {
        if (err) {
            throw err;
        }

        try {
            const {issuerDidDocument, subjectDidDocument, audienceDidDocument} = result;
            const jwtVcInstance = await credentials.createJWTVerifiableCredentialAsync(issuerDidDocument, subjectDidDocument, {exp: 1678812494957});

            const encodedJwtVc1 = await jwtVcInstance.getEncodedJWTAsync();
            const jwtVpInstance = await credentials.createJWTVerifiablePresentationAsync(subjectDidDocument, {
                exp: 1678812494957,
                aud: audienceDidDocument.getIdentifier()
            });
            await jwtVpInstance.addEncryptedCredentialAsync(encodedJwtVc1);

            const encodedJwtVp = await jwtVpInstance.getEncodedJWTAsync();
            const loadedJWTVpInstance = await credentials.loadJWTVerifiablePresentationAsync(encodedJwtVp);
            const verificationStatus = await loadedJWTVpInstance.verifyJWTAsync();

            assert.notNull(loadedJWTVpInstance, 'Load Result should be a JWTVp Instance');
            assert.notNull(verificationStatus, 'Verify Result should be an object');
            assert.true(verificationStatus.verifyResult, verificationStatus.errorMessage);

            const validationStrategies = credentials.validationStrategies;
            const {DEFAULT, ROOTS_OF_TRUST} = validationStrategies.VALIDATION_STRATEGIES;
            const environmentData = {
                atDate: new Date().getTime(),
                presentationPublicClaims: {aud: audienceDidDocument.getIdentifier()},
                rootsOfTrust: [issuerDidDocument.getIdentifier()]
            };

            const validateVCDefault = await validationStrategies.validateCredentialAsync(DEFAULT, {atDate: new Date().getTime()}, JSON.parse(JSON.stringify(encodedJwtVc1)));
            const validateVCRootsOfTrust = await validationStrategies.validateCredentialAsync(ROOTS_OF_TRUST, {
                atDate: new Date().getTime(),
                rootsOfTrust: [issuerDidDocument.getIdentifier()]
            }, JSON.parse(JSON.stringify(encodedJwtVc1)));

            const validateVPDefault = await validationStrategies.validatePresentationAsync(DEFAULT, environmentData, JSON.parse(JSON.stringify(verificationStatus)));
            const validateVPRootsOfTrust = await validationStrategies.validatePresentationAsync(ROOTS_OF_TRUST, environmentData, JSON.parse(JSON.stringify(verificationStatus)));
            const validateVPDefaultAndRootsOfTrust = await validationStrategies.validatePresentationAsync([DEFAULT, ROOTS_OF_TRUST], environmentData, JSON.parse(JSON.stringify(verificationStatus)));

            assert.true(validateVCDefault, `Credential Validation for DEFAULT strategy failed!`);
            assert.true(validateVCRootsOfTrust, `Credential Validation for ROOTS_OF_TRUST strategy failed!`);
            assert.true(validateVPDefault, `Presentation Validation for DEFAULT strategy failed!`);
            assert.true(validateVPRootsOfTrust, `Presentation Validation for ROOTS_OF_TRUST strategy failed!`);
            assert.true(validateVPDefaultAndRootsOfTrust, `Presentation Validation for both DEFAULT and ROOTS_OF_TRUST strategies failed!`);
            callback();
        } catch (e) {
            console.error(e);
            throw e;
        }
    });
}, 1000);