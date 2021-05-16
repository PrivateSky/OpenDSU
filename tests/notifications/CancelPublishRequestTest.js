require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;


dc.createTestFolder("ODSU_CancelPublishRequestTest", (err, testFolder) => {
	assert.true(err === null || typeof err === "undefined", "Failed to create test folder");


	assert.callback('Test canceling a delayed publish request', (callback) => {

		tir.launchApiHubTestNode(10, testFolder, async (err) => {
			assert.true(err === null || typeof err === "undefined", "Failed to launch MQNode");
			const keySSISpace = require('./../../keyssi');
			const http = require('./../../http');

			/**
			* Common test helpers
			*/
			const createKeySSI = (domain) => {
				domain = domain || 'default';
				return new Promise((resolve, reject) => {
					keySSISpace.createTemplateSeedSSI('default', (err, templateKeySSI) => {
						if (err) {
							return reject(err);
						}
						templateKeySSI.initialize(templateKeySSI.getDLDomain(), undefined, undefined, undefined, templateKeySSI.getHint(), (err, keySSI) => {
							if (err) {
								return reject(err);
							}
							resolve(keySSI);
						});
					});
				})
			}
			const delay = (delay) => {
				return new Promise((resolve) => {
					setTimeout(() => {
						resolve();
					}, delay);
				})
			}
			const keySSI = await createKeySSI();

			let requestExecuted = false;
			let requestError = null;

			const request = http.poll('/my/url', {}, 1 * 1000);

			request.then(() => {
				requestExecuted = true;
			}).catch(() => {
				requestError = true;
			});

			http.unpoll(request);
			await delay(1.5 * 1000);

			assert.false(requestExecuted, "The request wasn't executed");
			assert.true(requestError === null, "The request error handler wasn't called");
			callback();
		});
	}, 3000);
});
