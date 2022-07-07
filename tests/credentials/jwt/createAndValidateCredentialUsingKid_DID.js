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
                    const verifierDidDocument = await $$.promisify(w3cDID.createIdentity)('ssi:name', domain, "verifierDidDocument");
                    callback(undefined, {issuerDidDocument, subjectDidDocument, verifierDidDocument});
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
            const {issuerDidDocument, subjectDidDocument, verifierDidDocument} = result;
            const jwtVcInstance = await credentials.createJWTVerifiableCredentialAsync(issuerDidDocument, subjectDidDocument, {exp: 1678812494957});

            const encodedJwtVc1 = await jwtVcInstance.getEncodedJWTAsync();
            const jwtVpInstance = await credentials.createJWTVerifiablePresentationAsync(subjectDidDocument, {
                exp: 1678812494957,
                kid: verifierDidDocument.getIdentifier()
            });

            await jwtVpInstance.addVerifiableCredentialAsync(encodedJwtVc1);
            const encodedJwtVp = await jwtVpInstance.getEncodedJWTAsync();

            const validationStrategies = credentials.validationStrategies;
            const {SIGNATURE} = validationStrategies.VALIDATION_STRATEGIES;
            const environmentData = {atDate: new Date().getTime()};
            const validateVPSignature = await validationStrategies.validatePresentationAsync(SIGNATURE, environmentData, JSON.parse(JSON.stringify(encodedJwtVp)));

            assert.true(validateVPSignature, `Validation for SIGNATURE strategy failed!`);

            callback();
        } catch (e) {
            console.error(e);
            throw e;
        }
    });
}, 1000);