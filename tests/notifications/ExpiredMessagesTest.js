require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;


dc.createTestFolder("ODSU_StaleMessagesTest", (err, testFolder) => {
	assert.true(err === null || typeof err === "undefined", "Failed to create test folder");


	assert.callback("Test a subscriber doesn't receive expired messages", (callback) => {

		tir.launchApiHubTestNode(10, testFolder, async (err) => {
			assert.true(err === null || typeof err === "undefined", "Failed to launch MQNode");
			const helpers = require('./helpers');
			const keySSI = await helpers.createKeySSI();
			const notifications = require('./../../notifications');

			const publishNotification = helpers.promisifyPublish();
			const publishResponse = await publishNotification(keySSI, "ping");
			let messageReceived = false;


			assert.true(publishResponse.ok, 'Message was published');
			const message = await publishResponse.json();
			assert.true(message.message === "Message was added to queue and will be delivered later.", "Message was queued");

			const observable = notifications.getObservableHandler(keySSI, 1000);
			observable.on('error', () => {
				throw err;
			})
			observable.on('message', () => {
				messageReceived = true;
			})

			await helpers.delay(1500);
			assert.false(messageReceived, "Queued message wasn't delivered");
			callback();
		});
	}, 5000);
});
