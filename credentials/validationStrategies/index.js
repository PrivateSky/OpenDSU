const VALIDATION_STRATEGIES = require('../constants').VALIDATION_STRATEGIES;

const signatureValidation = require('./signatureValidation');
const rootsOfTrustValidation = require('./rootsOfTrustValidation');
const zkpCredentialValidation = require('./zkpCredentialValidation');

const validationStrategies = {};

function registerValidationStrategy(type, implementation) {
	validationStrategies[type] = implementation;
}

registerValidationStrategy(VALIDATION_STRATEGIES.SIGNATURE, signatureValidation);
registerValidationStrategy(VALIDATION_STRATEGIES.ROOTS_OF_TRUST, rootsOfTrustValidation);
registerValidationStrategy(VALIDATION_STRATEGIES.ZERO_KNOWLEDGE_PROOF_CREDENTIAL, zkpCredentialValidation);

function verifyJWTUsingStrategy(strategy, ...args) {
	if (typeof validationStrategies[strategy] !== 'function') {
		throw VALIDATION_STRATEGIES.INVALID_VALIDATION_STRATEGY;
	}

	validationStrategies[strategy](...args);
}

module.exports = verifyJWTUsingStrategy;