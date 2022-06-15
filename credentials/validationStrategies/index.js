const VALIDATION_STRATEGIES = require('../constants').VALIDATION_STRATEGIES;

const validationStrategies = {};

function registerValidationStrategy(validationStrategyName, implementation) {
	validationStrategies[validationStrategyName] = implementation;
}

function getValidationStrategy(validationStrategyName) {
	if (!validationStrategies[validationStrategyName]) {
		throw VALIDATION_STRATEGIES.INVALID_VALIDATION_STRATEGY;
	}

	return validationStrategies[validationStrategyName];
}

function validatePresentation(validationStrategyName, ...args) {
	if (!validationStrategies[validationStrategyName]) {
		throw VALIDATION_STRATEGIES.INVALID_VALIDATION_STRATEGY;
	}

	validationStrategies[validationStrategyName](...args);
}

module.exports = {
	registerValidationStrategy,
	validatePresentation,
	getValidationStrategy
};


let ValidationStrategy = {
	acceptSerialisedPresentation: function (presentationSerialisation) {
		return "ValidationStrategySpecificRepresentationForPresentation";
	},
	sign: function (stringOrHash) {
		return "signature serialisation, could be a credential";
	},
	issueCredential: function (...args) {
		return "CredentialSerialisation";
	},
	createPresentation: function (...args) {
		callback(undefined, "Presentation Serialisation");
	},
	createPrivacyPreservingPresentation: function (credentialsArray, attributesArray, callback) {
		callback(undefined, "Presentation Serialisation");
	},
	verifySignature: function (stringOrHash, serialisationOfASignature) {
		return "true or false";
	},
	verifyCredential: function (useCase, credentialSerialisation) {
		return "true or false";
	},
	revokeCredential: function (credentialSerialisation, callback) {
		callback("not implemented", false)
	}
}

let ValidationStrategySpecificRepresentationForPresentation = {
	validate: function (useCase, environmentData, callback) {
		if ("error") return callback("error", false);
		if ("valid presentation") return callback(undefined, true);
		callback(undefined, false)
	}
}

let implementationsRegistry = {};

function issueCredential(validationStrategyName,...args){
	return implementationsRegistry[validationStrategyName].issueCredential(...args);
}


function createPresentation(validationStrategyName, ...args){
	return implementationsRegistry[validationStrategyName].createPresentation(...args);
}


function sign(validationStrategyName, ...args){
	return implementationsRegistry[validationStrategyName].sign(...args);
}

function verifySignature(validationStrategyName, ...args){
	return implementationsRegistry[validationStrategyName].verifySignature(...args);
}

function verifyCredential(validationStrategyName, credentialSerialisation){
	return implementationsRegistry[validationStrategyName].verifyCredential(credentialSerialisation);
}

/*
    allowedImplementationNamesArray : array of names of validationStrategies that are allowed to validate. If is a string then only that strategy can do it.
    useCase: a string identifying the name of the use case in which a validationStrategy is used. Could be empty.
    environmentData: object with arbitrary data required for validation
    presentationSerialisation:  a serialised presentation
 */
function validatePresentation2(allowedImplementationNamesArray, useCase, environmentData, presentationSerialisation, callback){
	if(typeof allowedImplementationNamesArray == "string"){
		return implementationsRegistry[allowedImplementationNamesArray].acceptSerialisedPresentation(presentationSerialisation).validate(useCase, environmentData, callback);
	}
	allowedImplementationNamesArray.forEach( i => {
		let vs = implementationsRegistry[i].acceptSerialisedPresentation(presentationSerialisation);
		if(vs != undefined){
			return vs.validate(useCase, environmentData, presentationSerialisation, callback);
		}
	})
	return callback(undefined, false);
}