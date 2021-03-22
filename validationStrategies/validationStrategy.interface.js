
let ValidationStrategy = {
    acceptSerialisedPresentation: function(presentationSerialisation){ return "ValidationStrategySpecificRepresentationForPresentation"; },
    sign: function(stringOrHash){ return "signature serialisation, could be a credential";},
    issueCredential: function(...args){ return "CredentialSerialisation";},
    createPresentation: function(...args){  callback(undefined, "Presentation Serialisation");},
    createPrivacyPreservingPresentation: function(credentialsArray, attributesArray, callback){ callback(undefined, "Presentation Serialisation"); },
    verifySignature: function(stringOrHash, serialisationOfASignature){ return "true or false"; },
    verifyCredential: function(useCase, credentialSerialisation){ return "true or false"; },
    revokeCredential: function(credentialSerialisation, callback){ callback("not implemented", false)}
}

let ValidationStrategySpecificRepresentationForPresentation = {
    validate: function(useCase, environmentData, callback){  if("error") return callback("error", false); if("valid presentation") callback(undefined, true) else callback(undefined, false) }
}
