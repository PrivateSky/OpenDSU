
/*
    OpenDSU W3C compatible DID method
        - compatible with SeedSSIs

        did:ssi:pk:domain::publickey:
        did:ssi:alias:domain:string:pubkey:
        did:method:string
        - a set of APIs and an extensible resolver that can embed arbitrary resolvers ( did:ssi:w3c:domainAsMethod:specificString) masquerading as ledger domains for KeySSIs

        pluginisable resolver

 */

const OPENDSU_METHOD_NAME = "ssi";
const PK_SUBTYPE = "pk";
const ALIAS_SUBTYPE = "alias";

let methodRegistry = {};

/*
    Create a new W3CDID based on SeedSSI
 */
function createIdentity(didMethod, ...args){
    let callback = args.pop();
    methodRegistry[didMethod].create(...args, callback);
}


/*
    Returns an error or an instance of W3CDID
 */
function resolveDID(identifier, callback){
    let tokens = identifier.split(":");
    let method = tokens[1];
    if( tokens[1] == OPENDSU_METHOD_NAME){
        method = tokens[2];
    }
    methodRegistry[method].resolve(tokens, callback);
}



function registerDIDMethod(method, implementation){
    methodRegistry[method] = implementation;
}


registerDIDMethod(PK_SUBTYPE, require("./ssiMethod").createPK_DIDMethod());
registerDIDMethod(ALIAS_SUBTYPE, require("./ssiMethod").createAlias_DIDMethod());

module.exports = {
    createIdentity,
    resolveDID,
    registerDIDMethod
}