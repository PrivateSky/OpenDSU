require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;


dc.createTestFolder("ODSU_CancelPublishRequestTest", (err, testFolder) => {
	assert.true(err === null || typeof err === "undefined", "Failed to create test folder");


	assert.callback('Test canceling a delayed publish request', (callback) => {

		tir.launchApiHubTestNode(10, testFolder, async (err) => {
			assert.true(err === null || typeof err === "undefined", "Failed to launch MQNode");
			const helpers = require('./helpers');
			const http = require('./../../http');
			const keySSI = await helpers.createKeySSI();

			let requestExecuted = false;
			let requestError = null;

			const request = http.poll('/my/url', {}, 1 * 1000);

			request.then(() => {
				requestExecuted = true;
			}).catch(() => {
				requestError = true;
			});

			http.unpoll(request);
			await helpers.delay(1.5 * 1000);

			assert.false(requestExecuted, "The request wasn't executed");
			assert.true(requestError === null, "The request error handler wasn't called");
			callback();
		});
	}, 3000);
});
