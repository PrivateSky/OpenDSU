const mappingRegistry = require("./mappingRegistry.js");
const apisRegistry = require("./apisRegistry.js");

//loading defaultApis
require("./defaultApis");

//loading defaultMappings
require("./defaultMappings");

function MappingEngine(storageService, options) {
	if (typeof storageService === "undefined"
		|| typeof storageService.beginBatch !== "function"
		|| typeof storageService.commitBatch !== "function"
		|| typeof storageService.cancelBatch !== "function") {
		throw Error("The MappingEngine requires a storage service that exposes beginBatch, commitBatch, cancelBatch apis!");
	}

	const errorHandler = require("opendsu").loadApi("error");

	//the purpose of the method is to create a "this" instance to be used during a message mapping process
	function buildMappingInstance() {
		let instance = {storageService, options};
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

			async function process() {
				const mappings = mappingRegistry.getMappings();
				let messageDigested = false;

				for (let i = 0; i < mappings.length; i++) {
					let mapping = mappings[i];
					let {matchFunction, mappingFunction} = mapping;
					let applyMapping = await matchFunction(message);

					if (applyMapping) {
						const instance = buildMappingInstance();
						try{
							await mappingFunction.call(instance, message);


						//if all good until this point, we need to commit any registeredDSU during the message mapping
						const commitPromises = [];
						for (let i = 0; i < instance.registeredDSUs.length; i++) {
							const commitBatch = $$.promisify(instance.registeredDSUs[i].commitBatch);
							commitPromises.push(commitBatch());
						}

						Promise.all(commitPromises)
							.then(async results => {
									for (let i = 0; i < results.length; i++) {
										let result = results[i];
										if (result && result.status === "rejected") {
											await $$.promisify(instance.registeredDSUs[i].cancelBatch)();
											let getDSUIdentifier = $$.promisify(instance.registeredDSUs[i].getKeySSIAsString);
											return reject(errorHandler.createOpenDSUErrorWrapper(`Cancel batch on dsu identified with ${await getDSUIdentifier()}`, error));
										}
									}
									resolve(true);
								}
							).catch(err => {
							return reject(errorHandler.createOpenDSUErrorWrapper(`Caught error during commit batch on registered DSUs`, err));
						});
						}
						catch(err){
							reject(errorHandler.createOpenDSUErrorWrapper(`Caught error during mapping`, err));
						}
						messageDigested = true;
						//we apply only the first mapping found to be suited for the message that we try to digest
						break;
					}
				}
				if (!messageDigested) {
					let messageString = JSON.stringify(message);
					const maxDisplayLength = 1024;
					console.log(`Unable to find a suitable mapping to handle the following message: ${messageString.length<maxDisplayLength?messageString:messageString.slice(0,maxDisplayLength)+"..."}`);
					reject(`Unable to find a suitable mapping to handle the messsage`);
				}
				return messageDigested;
			}

			return process();
		});
	}

	let inProgress = false;
	this.digestMessages = (messages) => {
		if (!Array.isArray(messages)) {
			messages = [messages];
		}

		async function rollback(){
			const cancelBatch = $$.promisify(storageService.cancelBatch);
			try {
				await cancelBatch();
			}
			catch (e){
				console.log("Not able to cancel batch", e)
			}
			inProgress = false;

		}

		async function finish() {
			const commitBatch = $$.promisify(storageService.commitBatch);
			try {
				await commitBatch();
			}
			catch (e) {
				console.log("Not able to commit batch",e)
			}

			inProgress = false;
		}

		return new Promise((resolve, reject) => {
				if (inProgress) {
					throw Error("Mapping Engine is digesting messages for the moment.");
				}
				inProgress = true;
				storageService.beginBatch();

				//digests will contain promises for each of message digest
				let digests = [];

				for (let i = 0; i < messages.length; i++) {
					let message = messages[i];
					if (typeof message !== "object") {
						throw Error(`Message is not an Object is :${typeof message} and has the value: ${message}`);
					}

					function handleErrorsDuringPromiseResolving(err) {
						reject(err);
					}

					try {
						digests.push(digestMessage(message));
					} catch (err) {
						errorHandler.reportUserRelevantError("Caught error during message digest", err);
					}

				}

			function digestConfirmation(results) {
				let failedMessages = [];
				for (let index = 0; index < results.length; index++) {
					let result = results[index];
					switch (result.status) {
						case "fulfilled" :
							if (result.value === false) {
								// message digest failed
								failedMessages.push({
									message: messages[index],
									reason: `Not able to digest message due to missing suitable mapping`
								});
							}
							break;
						case "rejected" :
							failedMessages.push({
								message: messages[index],
								reason: result.reason
							});
							break;
					}
				}

				finish().then(()=>{
					resolve(failedMessages);
				}).catch(async (err)=>{
					await rollback();
					reject(err);
				});
			}


				Promise.allSettled(digests)
				.then(digestConfirmation)
				.catch(handleErrorsDuringPromiseResolving);

			}
		);
	}

	return this;
}

module.exports = {
	getMappingEngine: function (persistenceDSU, options) {
		return new MappingEngine(persistenceDSU, options);
	},
	getMessagesPipe:function (){
		return require("./messagesPipe");
	},
	defineMapping: mappingRegistry.defineMapping,
	defineApi: apisRegistry.defineApi
}