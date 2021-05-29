/*
    OpenDSU W3C compatible  ID pluginisable resolver  that can resolve arbitrary DID methods.

        1. SeedSSI compatible DID method that does not need anchoring or external DSUs
            did:ssi:sReadPK:blockchain_domain::publicKey:v2:

        2.  DID method storing the public key in an anchored DSU. It is a SeedSSI compatible DID method.
            did:ssi:sRead:blockchain_domain::hash_publicKey::

        3.  DID method storing the public key in an immutable DSU that is mounting another mutable DSU to store the keys
            did:ssi:const:blockchain_domain:const_string:::

        4. Group DID
            did:ssi:group:blockchain_domain:const_string

        5. Other possibilities could be  DID Web Method, or a did:alias, etc
            did:web:internet_domain.




        TODO: analise the implementation of resolvers  masquerading as DSUs anchored in the BDNS central root:  did:ethereum:whatever

 */

const OPENDSU_METHOD_NAME = "ssi";
const S_READ_PK_SUBTYPE = "sReadPK";
const S_READ_SUBTYPE = "sRead";
const CONST_SUBTYPE = "const";
const DEMO_METHOD_NAME = "demo";
const GROUP_METHOD_NAME = "group";

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
    if (tokens[1] === OPENDSU_METHOD_NAME) {
        method = tokens[2];
    }
    methodRegistry[method].resolve(tokens, callback);
}

function registerDIDMethod(method, implementation) {
    methodRegistry[method] = implementation;
}


registerDIDMethod(S_READ_SUBTYPE, require("./didssi/ssiMethods").create_sRead_DIDMethod());
registerDIDMethod(S_READ_PK_SUBTYPE, require("./didssi/ssiMethods").create_sReadPK_DIDMethod());
registerDIDMethod(CONST_SUBTYPE, require("./didssi/ssiMethods").create_const_DIDMethod());

registerDIDMethod(DEMO_METHOD_NAME, require("./demo/diddemo").create_demo_DIDMethod());
registerDIDMethod(GROUP_METHOD_NAME, require("./didssi/ssiMethods").create_group_DIDMethod());


module.exports = {
    createIdentity,
    resolveDID,
    registerDIDMethod
}
