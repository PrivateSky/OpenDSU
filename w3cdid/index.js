/*
    OpenDSU W3C compatible  ID pluginisable resolver  that can resolve arbitrary DID methods.

        1. SeedSSI compatible DID method that does not need anchoring or external DSUs
            did:ssi:key:blockchain_domain::publicKey:v2:

        2.  DID method storing the public key in an anchored DSU. It is a SeedSSI compatible DID method.
            did:ssi:sread:blockchain_domain:hash_privateKey:hash_publicKey:

        3.  DID method storing the public key in an immutable DSU that is mounting another mutable DSU to store the keys
            did:ssi:name:blockchain_domain:public-name:::

        4. Group DID
            did:ssi:group:blockchain_domain:const_string

        5. DID Web Method
            did:web:internet_domain.

        6. SSI DID_KEY
            did:key:public_key

        7. DID DEMO
            did:demo:const_string
        TODO: analise the implementation of resolvers  masquerading as DSUs anchored in the BDNS central root:  did:ethereum:whatever

 */

const methodsNames = require("./didMethodsNames");
let methodRegistry = {};

/*
    Create a new W3CDID based on SeedSSI
 */
function createIdentity(didMethod, ...args) {
    let callback = args.pop();
    methodRegistry[didMethod].create(...args, callback);
}


/*
    Returns an error or an instance of W3CDID
 */
function resolveDID(identifier, callback) {
    let tokens = identifier.split(":");
    if (tokens[0] !== "did") {
        return callback(Error("Wrong identifier format. Missing did keyword."));
    }
    let method = tokens[1];
    if (tokens[1] === methodsNames.OPENDSU_METHOD_NAME) {
        method = tokens[2];
        if (method === methodsNames.KEY_SUBTYPE) {
            method = methodsNames.SSI_KEY_SUBTYPE;
        }
    }
    methodRegistry[method].resolve(tokens, callback);
}

function registerDIDMethod(method, implementation) {
    methodRegistry[method] = implementation;
}


registerDIDMethod(methodsNames.S_READ_SUBTYPE, require("./didssi/ssiMethods").create_SReadDID_Method());
registerDIDMethod(methodsNames.SSI_KEY_SUBTYPE, require("./didssi/ssiMethods").create_KeyDID_Method());
registerDIDMethod(methodsNames.NAME_SUBTYPE, require("./didssi/ssiMethods").create_NameDID_Method());

registerDIDMethod(methodsNames.DEMO_METHOD_NAME, require("./demo/diddemo").create_demo_DIDMethod());
registerDIDMethod(methodsNames.GROUP_METHOD_NAME, require("./didssi/ssiMethods").create_GroupDID_Method());
registerDIDMethod(methodsNames.KEY_SUBTYPE, require("./w3cdids/didMethods").create_KeyDID_Method());
registerDIDMethod(methodsNames.SMART_CONTRACT_SUBTYPE, require("./didssi/ssiMethods").create_ContractDID_Method());


module.exports = {
    createIdentity,
    resolveDID,
    registerDIDMethod,
    CryptographicSkills: require("./CryptographicSkills/CryptographicSkills")
}
