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
			const keySSISpace = require('./../../keyssi');
			const notifications = require('./../../notifications');

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
			await delay(50);
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
