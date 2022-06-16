const VALIDATION_STRATEGIES = require('../constants').VALIDATION_STRATEGIES;
const DefaultValidationStrategy = require("./defaultValidationStrategy");
const RootOfTrustValidationStrategy = require("./rootOfTrustValidationStrategy");
const SignatureValidationStrategy = require("./signatureValidationStrategy");

const validationStrategies = {};

/**
 * @param validationStrategyName {string} The name of the validation strategy that will be registered
 * @param implementation The implementation of the strategy. Check validationStrategy.interface.js for reference
 */
function registerValidationStrategy(validationStrategyName, implementation) {
    validationStrategies[validationStrategyName] = implementation;
}

/**
 * @param validationStrategyName {string} The name of the validation strategy to be returned
 * @returns {Object} The implementation of the validation strategy
 */
function getValidationStrategy(validationStrategyName) {
    if (!validationStrategies[validationStrategyName]) {
        return callback(VALIDATION_STRATEGIES.INVALID_VALIDATION_STRATEGY);
    }

    return validationStrategies[validationStrategyName];
}

/**
 * @param validationStrategyName {string} The name of the validation strategy that will be used to validate the credential
 * @param environmentData {string} JWT Verifiable Presentation
 * @param callback {Function}
 */
function validateCredential(validationStrategyName, environmentData, callback) {
    if (!validationStrategies[validationStrategyName]) {
        return callback(VALIDATION_STRATEGIES.INVALID_VALIDATION_STRATEGY);
    }

    validationStrategies[validationStrategyName].validateCredential(environmentData, callback);
}

/**
 * Async version of validateCredential method
 * @param validationStrategyName
 * @param environmentData
 * @returns {Promise<*>}
 */
async function validateCredentialAsync(validationStrategyName, environmentData) {
    return await $$.promisify(validateCredential)(validationStrategyName, environmentData);
}

/**
 * @param validationStrategyNamesArray {string|string[]} array of names of validationStrategies that are allowed to validate. If is a string then only that strategy can do it.
 * @param useCase {string} a string identifying the name of the use case in which a validationStrategy is used. Could be empty.
 * @param environmentData {Object} object with arbitrary data required for validation
 * @param presentationSerialisation {string} JWT Verifiable Presentation
 * @param callback {Function}
 */
function validatePresentation(validationStrategyNamesArray, useCase, environmentData, presentationSerialisation, callback) {
    if (typeof validationStrategyNamesArray === "string") {
        validationStrategyNamesArray = [validationStrategyNamesArray];
    }

    const validationStrategyChain = (validationStrategyNamesList) => {
        if (validationStrategyNamesList.length === 0) {
            return callback(undefined, true);
        }

        const validationStrategyName = validationStrategyNamesList.shift();
        if (!validationStrategies[validationStrategyName]) {
            return callback(VALIDATION_STRATEGIES.INVALID_VALIDATION_STRATEGY);
        }

        const jwtVp = JSON.parse(JSON.stringify(presentationSerialisation));
        validationStrategies[validationStrategyName].validatePresentation(jwtVp, environmentData, (err, isValidPresentation) => {
            if (err) return callback(err);
            if (!isValidPresentation) return callback(undefined, false);

            validationStrategyChain(validationStrategyNamesList);
        });
    };
    validationStrategyChain(validationStrategyNamesArray);
}

/**
 * Async version of validatePresentation method
 * @param validationStrategyNamesArray
 * @param useCase
 * @param environmentData
 * @param presentationSerialisation
 * @returns {Promise<*>}
 */
async function validatePresentationAsync(validationStrategyNamesArray, useCase, environmentData, presentationSerialisation) {
    return await $$.promisify(validatePresentation)(validationStrategyNamesArray, useCase, environmentData, presentationSerialisation);
}

registerValidationStrategy(VALIDATION_STRATEGIES.DEFAULT, new DefaultValidationStrategy());
registerValidationStrategy(VALIDATION_STRATEGIES.ROOTS_OF_TRUST, new RootOfTrustValidationStrategy());
registerValidationStrategy(VALIDATION_STRATEGIES.SIGNATURE, new SignatureValidationStrategy());

module.exports = {
    getValidationStrategy,
    registerValidationStrategy,

    validateCredential,
    validateCredentialAsync,
    validatePresentation,
    validatePresentationAsync,

    VALIDATION_STRATEGIES
};