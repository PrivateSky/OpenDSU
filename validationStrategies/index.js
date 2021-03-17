
let implementationsRegistry = {};

function getStrategy(validationStrategyName){
    return implementationsRegistry [validationStrategyName];
}

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
function validatePresentation(allowedImplementationNamesArray, useCase, environmentData, presentationSerialisation, callback){
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


function registerValidationStrategy(validationStrategyName, implementation){
    implementationsRegistry[validationStrategyName] = implementation;
}

module.exports = {
    issueCredential,
    createPresentation,
    validatePresentation,
    registerValidationStrategy,
    sign,
    verifySignature,
    getStrategy
}
