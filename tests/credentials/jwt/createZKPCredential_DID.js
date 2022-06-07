require('../../../../../psknode/bundles/testsRuntime');

const dc = require('double-check');
const assert = dc.assert;
const tir = require('../../../../../psknode/tests/util/tir');

const openDSU = require('../../../index');
$$.__registerModule('opendsu', openDSU);
const w3cDID = openDSU.loadAPI('w3cdid');
const scAPI = openDSU.loadAPI('sc');
const crypto = openDSU.loadApi('crypto');

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
					const issuerDidDocument = await $$.promisify(w3cDID.createIdentity)('ssi:name', domain, crypto.generateRandom(20).toString('hex'));
					const subjectDidDocument = await $$.promisify(w3cDID.createIdentity)('ssi:name', domain, crypto.generateRandom(20).toString('hex'));
					const audienceDidDocument = await $$.promisify(w3cDID.createIdentity)('ssi:name', domain, crypto.generateRandom(20).toString('hex'));
					callback(undefined, { issuerDidDocument, subjectDidDocument, audienceDidDocument });
				} catch (e) {
					callback(e);
				}
			});
		});
	});
}

assert.callback('[DID] Create JWT VC and VP with Zero Knowledge proof credential embedded into presentation', (callback) => {
	launchApiHubAndCreateDIDs(async (err, result) => {
		if (err) {
			throw err;
		}

		try {
			const { issuerDidDocument, subjectDidDocument, audienceDidDocument } = result;
			const jwtVcInstance = await credentials.createJWTVerifiableCredentialAsync(issuerDidDocument, subjectDidDocument, { exp: 1678812494957 });

			const encodedJwtVc1 = await jwtVcInstance.getEncodedJWTAsync();
			const jwtVpInstance = await credentials.createJWTVerifiablePresentationAsync(subjectDidDocument, {
				exp: 1678812494957,
				aud: audienceDidDocument.getIdentifier()
			});
			await jwtVpInstance.addZeroKnowledgeProofCredentialAsync(encodedJwtVc1);

			const encodedJwtVp = await jwtVpInstance.getEncodedJWTAsync();
			const loadedJWTVpInstance = await credentials.loadJWTVerifiablePresentationAsync(encodedJwtVp);
			const verificationStatus = await loadedJWTVpInstance.verifyJWTAsync(Date.now());

			console.log(verificationStatus.vp.verifiableCredential);
			assert.notNull(loadedJWTVpInstance, 'Load Result should be a JWTVp Instance');
			assert.notNull(verificationStatus, 'Verify Result should be an object');
			assert.true(verificationStatus.verifyResult, verificationStatus.errorMessage);
			callback();
		} catch (e) {
			console.error(e);
			throw e;
		}
	});
}, 1000);