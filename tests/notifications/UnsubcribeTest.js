require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;


dc.createTestFolder("ODSU_UnsubscribeTest", (err, testFolder) => {
	assert.true(err === null || typeof err === "undefined", "Failed to create test folder");


	assert.callback('Test notification unsubscribing', (callback) => {
		tir.launchApiHubTestNode(10, testFolder, async (err) => {
			assert.true(err === null || typeof err === "undefined", "Failed to launch MQNode");
			const helpers = require('./helpers');
			const notifications = require('./../../notifications');
			const keySSI = await helpers.createKeySSI();

			/**
			 * Test that the observable message handler isn't called
			 * after unsubscribing
			 */
			const testUnsuscribeFromInstantRequest = async () => {
				let messageReceived = false;
				return new Promise(async (resolve) => {
					const observable = notifications.getObservableHandler(keySSI);
					observable.on('error', (err) => {
						throw err;
					})
					observable.on('message', (message) => {
						messageReceived = true;
					})

					// Allow the request to be created
					await helpers.delay(50);
					notifications.unsubscribe(observable);
					assert.false(notifications.isSubscribed(observable));

					const publishNotification = helpers.promisifyPublish();
					const publishResponse = await publishNotification(keySSI, "ping", 250);
					assert.true(publishResponse.ok, 'Message was published');
					const message = await publishResponse.json();
					// This is ok. The poll request wasn't delayed so it was executed before we unsubscribed.
					// We're only testing that the subscription event handler isn't called
					assert.true(message.message === "Message delivered to 1 subscribers.", "Message was delivered");

					// Allow some time for the message to be delivered
					await helpers.delay(100);
					assert.false(messageReceived, "Observable message handler wasn't called");
					resolve();
				})
			}

			/**
			 * Test that unsubscribing cancels a delayed polling request
			 * before execution
			 */
			const testUnsuscribeFromDelayedRequest = async () => {
				let messageReceived = false;
				return new Promise(async (resolve) => {
					const observable = notifications.getObservableHandler(keySSI, 499);
					observable.on('error', (err) => {
						throw err;
					})
					observable.on('message', () => {
						messageReceived = true;
					})

					// Allow the request to be created
					await helpers.delay(50);
					notifications.unsubscribe(observable);
					assert.false(notifications.isSubscribed(observable));

					const publishNotification = helpers.promisifyPublish();
					const publishResponse = await publishNotification(keySSI, "ping", 250);
					assert.true(publishResponse.ok, 'Message was published');
					const message = await publishResponse.json();
					assert.true(message.message === "Message was added to queue and will be delivered later.", "Message was queued");

					await helpers.delay(100);
					assert.false(messageReceived, "Observable message handler wasn't called");
					resolve();
				})
			}

			const testUnsubscribeAfterAFewReceivedMessages = async () => {
				let messageCounter = 0;
				return new Promise(async (resolve) => {
					const observable = notifications.getObservableHandler(keySSI, 100);
					observable.on('error', (err) => {
						throw err;
					})
					observable.on('message', () => {
						messageCounter++;
						if (messageCounter == 2) {
							notifications.unsubscribe(observable);
						}
					})
					// Allow the request to be created
					await helpers.delay(50);
					assert.true(notifications.isSubscribed(observable));

					const publishNotification = helpers.promisifyPublish();
					await publishNotification(keySSI, "ping");
					await publishNotification(keySSI, "pong");
					await publishNotification(keySSI, "ping");
					await publishNotification(keySSI, "pong");

					await helpers.delay(500);
					assert.true(messageCounter === 2, "Only two messages received");
					resolve();
				})
			}

			await testUnsuscribeFromInstantRequest();
			await testUnsuscribeFromDelayedRequest();
			await testUnsubscribeAfterAFewReceivedMessages();
			callback();

		});

	}, 5000);
});
