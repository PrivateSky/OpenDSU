require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;


dc.createTestFolder("ODSU_SimplePubSubTest", (err, testFolder) => {
	assert.true(err === null || typeof err === "undefined", "Failed to create test folder");


	assert.callback('Test simple PubSub', (callback) => {

		let messageReceived = false;
		let messageSent = false;

		const done = () => {
			if (messageReceived && messageSent) {
				callback();
			}
		}

		tir.launchApiHubTestNode(10, testFolder, async (err) => {
			assert.true(err === null || typeof err === "undefined", "Failed to launch MQNode");
			const helpers = require('./helpers');
			const notifications = require('./../../notifications');

			const keySSI = await helpers.createKeySSI();

			const observable = notifications.getObservableHandler(keySSI);
			observable.on('error', (err) => {
				throw err;
			})

			observable.on('message', async (message) => {
				assert.true(message.ok, 'Message was received');
				message = await message.json();
				assert.true(message.message === "ping", "Message payload is correct");
				done(messageReceived = true);
			})
			await helpers.delay(50);
			assert.true(notifications.isSubscribed(observable), "Subscription exists");

			notifications.publish(keySSI, "ping", 500, async (err, response) => {
				assert.true(typeof err === 'undefined', 'No error is thrown when publishing');
				assert.true(response.ok, 'Message was published');

				const message = await response.json();
				assert.true(message.message === "Message delivered to 1 subscribers.", "Message was delivered");
				done(messageSent = true);
			})
		});
	}, 2000);
});
