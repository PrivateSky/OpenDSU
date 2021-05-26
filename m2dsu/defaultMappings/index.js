const mappingRegistry = require("./../mappingRegistry.js");

async function validateMessage(message){
	return !!(message.messageType === "standard");
}

async function digestMessage(message){
	throw Error("Not implemented yet!");
}

mappingRegistry.defineMapping(validateMessage, digestMessage);