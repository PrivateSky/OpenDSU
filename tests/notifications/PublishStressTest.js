require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const { promisify } = require('util');
const dc = require("double-check");
const assert = dc.assert;


dc.createTestFolder("ODSU_PublishStressTest", (err, testFolder) => {
	assert.true(err === null || typeof err === "undefined", "Failed to create test folder");


	assert.callback('Test mass publishing without subscribers', (callback) => {

		let messageReceived = false;
		let messageSent = false;

		tir.launchApiHubTestNode(10, testFolder, async (err) => {
			assert.true(err === null || typeof err === "undefined", "Failed to launch MQNode");
			const keySSISpace = require('./../../keyssi');
			const notifications = require('./../../notifications');
			const publish = promisify(notifications.publish);

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

			const keys = [];

			for (let i = 0; i < 5; i++) {
				const keySSI = await createKeySSI();
				keys.push(keySSI);
			}

			let keyCounter = 0;
			for (const key of keys) {
				console.log(`Sending 500 messages to subscriber ${++keyCounter}`);
				for (let i = 0; i < 500; i++) {
					await publish(key, `Message ${i}`);
				}
			}
			console.log('Waiting for messages to expire...');
			await delay(3000);

			let msgHandlerCalledCounter = 0;
			let errorHandlerCalled = false;
			const notifErrorHandler = () => {
				errorHandlerCalled = true;
			};

			const notifMessageHandler = () => {
				console.log('Called');
				msgHandlerCalledCounter++;
			}

			console.log('Registering 5 subscribers...');
			const observables = [];
			for (const key of keys) {
				const observable = notifications.getObservableHandler(key);
				observable.on('error', notifErrorHandler);
				observable.on('message', notifMessageHandler);
				observables.push(observable);
			}

			console.log('Waiting for subscribers to receive notifications...')
			await delay(500);
			assert.true(msgHandlerCalledCounter === 0, "No messages were received");
			assert.false(errorHandlerCalled, "No error encountered");

			callback();
		});
	}, 10 * 1000);
});
