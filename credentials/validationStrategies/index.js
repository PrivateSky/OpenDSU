const VALIDATION_STRATEGIES = require('../constants').VALIDATION_STRATEGIES;

const signatureValidation = require('./signatureValidation');
const rootsOfTrustValidation = require('./rootsOfTrustValidation');
const encryptedCredentialValidation = require('./encryptedCredentialValidation');

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

registerValidationStrategy(VALIDATION_STRATEGIES.SIGNATURE, signatureValidation);
registerValidationStrategy(VALIDATION_STRATEGIES.ROOTS_OF_TRUST, rootsOfTrustValidation);
registerValidationStrategy(VALIDATION_STRATEGIES.ENCRYPTED_CREDENTIAL, encryptedCredentialValidation);

module.exports = {
	registerValidationStrategy,
	validatePresentation,
	getValidationStrategy
};