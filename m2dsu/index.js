const mappingRegistry = require("./mappingRegistry.js");
const apisRegistry = require("./apisRegistry.js");

//loading defaultApis
require("./defaultApis");

//loading defaultMappings
require("./defaultMappings");

function MappingEngine(persistenceDSU, options) {
	if (typeof persistenceDSU === "undefined" || typeof persistenceDSU.beginBatch !== "function") {
		throw Error("The MappingEngine requires a valid persistence DSU to be provided!");
	}

	const errorHandler = require("opendsu").loadApi("error");

	//the purpose of the method is to create a "this" instance to be used during a message mapping process
	function buildMappingInstance() {
		let instance = {persistenceDSU, options};
		const apis = apisRegistry.getApis();

		//we inject all the registered apis on the instance that will become the "this" for a mapping
		for (let prop in apis) {
			if (typeof instance[prop] !== "undefined") {
				console.log(`Take note that an overwriting processing is in place for the api named ${prop}.`);
			}
			instance[prop] = (...args) => {
				return apis[prop].call(instance, ...args);
			}
		}

		return instance;
	}

	function digestMessage(message) {
		return new Promise((resolve, reject) => {
			function finish() {
				//first of all we set an event listener to catch any errors during the commit processes
				errorHandler.observeUserRelevantMessages("error", function ({message, error}) {
					return reject(errorHandler.createOpenDSUErrorWrapper("Caught an error during commit batch", error));

					/*const cancelBatch = $$.promisify(persistenceDSU.cancelBatch);
					cancelBatch().then(res => {
						reject(errorHandler.createOpenDSUErrorWrapper("Batch canceled", error));
					}).catch(err => {
						reject(errorHandler.createOpenDSUErrorWrapper("Batch canceled", errorHandler.createOpenDSUErrorWrapper(err.message, error)));
					});*/
				});
			}

			async function process() {
				const mappings = mappingRegistry.getMappings();
				let messageDigested = false;

				for (let i = 0; i < mappings.length; i++) {
					let mapping = mappings[i];
					let {matchFunction, mappingFunction} = mapping;
					let applyMapping = await matchFunction(message);

					if (applyMapping) {
						const instance = buildMappingInstance();
						await mappingFunction.call(instance, message);

						//if all good until this point, we need to commit any registeredDSU during the message mapping
						const commitPromises = [];
						for (let i = 0; i < instance.registeredDSUs.length; i++) {
							const commitBatch = $$.promisify(instance.registeredDSUs[i].commitBatch);
							commitPromises.push(commitBatch());
						}

						Promise.all(commitPromises)
							.then( async results => {
									for (let i = 0; i < results.length; i++) {
										let result = results[i];
										if (result && result.status == "rejected") {
											registeredDSUs[i].cancelBatch();
											let getDSUIdentifier = $$.promisify(registeredDSUs[i].getKeySSIAsString);
											return reject(errorHandler.createOpenDSUErrorWrapper(`Cancel batch on dsu identified with ${await getDSUIdentifier()}`, error));
										}
									}
									resolve(true);
								}
							).catch(err => {
							return reject(errorHandler.createOpenDSUErrorWrapper(`Caught error during commit batch on registered DSUs`, err));
						});
						messageDigested = true;
						//we apply only the first mapping found to be suited for the message that we try to digest
						break;
					}
				}
				if (!messageDigested) {
					console.log(`Unable to find a suitable mapping to handle the following message: ${JSON.stringify(message)}`);
				}
				return messageDigested;
			}

			return process();
		});
	}

	this.digestMessages = (messages) => {
		if (!Array.isArray(messages)) {
			messages = [messages];
		}

		return new Promise((resolve, reject) => {

				//digests will contain promises for each of message digest
				let digests = [];

				for (let i = 0; i < messages.length; i++) {
					let message = messages[i];
					if (typeof message !== "object") {
						throw Error(`Message is not an Object is :${typeof message} and has the value: ${message}`);
					}

					function digestConfirmation(results) {
						let collectedResults = [];
						for (let index = 0; index < results.length; index++) {
							let result = results[index];
							switch (result.status) {
								case "fulfilled" :
									if (result.value === false) {
										// message digest failed
										return reject(errorHandler.createOpenDSUErrorWrapper(`Not able to digest message ${JSON.stringify(messages[index])}`, Error("Mapping failed.")));
									} else {
										collectedResults.push(result.value);
									}
									break;
								case "rejected" :
									reject(errorHandler.createOpenDSUErrorWrapper("Not able to digest messages.", result.reason));
									break;
							}
						}

						resolve(collectedResults);
					}

					function handleErrorsDuringPromiseResolving(err) {
						reject(err);
					}

					try {
						digests.push(digestMessage(message));
					} catch (err) {
						errorHandler.reportUserRelevantError("Caught error during message digest", err);
					}

					Promise.allSettled(digests)
						.then(digestConfirmation)
						.catch(handleErrorsDuringPromiseResolving);
				}

			}
		);
	}

	return this;
}

module.exports = {
	getMappingEngine: function (persistenceDSU/*, options*/) {
		return new MappingEngine(persistenceDSU/*, options*/);
	},
	defineMapping: mappingRegistry.defineMapping,
	defineApi: apisRegistry.defineApi
}

