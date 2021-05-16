const utils = require('util');
require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;


dc.createTestFolder("ODSU_StaleMessagesTest", (err, testFolder) => {
	assert.true(err === null || typeof err === "undefined", "Failed to create test folder");


	assert.callback("Test a subscriber doesn't receive expired messages", (callback) => {

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
			const promisifyPublish = () => {
				return utils.promisify(notifications.publish);
			}

			const keySSI = await createKeySSI();

			const publishNotification = promisifyPublish();
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

			await delay(1500);
			assert.false(messageReceived, "Queued message wasn't delivered");
			callback();
		});
	}, 5000);
});
