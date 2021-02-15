
let implementationsRegistry = {};

function issueCredential(verificationServiceName){

}


function createPresentation(verificationServiceName){

}


/*
    allowedImplementationNames : array of implementationNames that can
    environmentData: array
 */
function verifyPresentation(allowedImplementationNames, environmentData, presentation){

}


function registerVerifiableCredentialsService(verificationServiceName, implementation){
    implementationsRegistry[verificationServiceName] = implementation;
}

module.exports = {
    issueCredential,
    createPresentation,
    verifyPresentation,
    registerVerifiableCredentialsService
}
