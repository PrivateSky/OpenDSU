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

const OPENDSU_METHOD_NAME = "ssi";
const KEY_SUBTYPE = "key";
const S_READ_SUBTYPE = "sread";
const NAME_SUBTYPE = "name";
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


registerDIDMethod(S_READ_SUBTYPE, require("./didssi/ssiMethods").create_SReadDID_Method());
registerDIDMethod(KEY_SUBTYPE, require("./didssi/ssiMethods").create_KeyDID_Method());
registerDIDMethod(NAME_SUBTYPE, require("./didssi/ssiMethods").create_NameDID_Method());

registerDIDMethod(DEMO_METHOD_NAME, require("./demo/diddemo").create_demo_DIDMethod());
registerDIDMethod(GROUP_METHOD_NAME, require("./didssi/ssiMethods").create_GroupDID_Method());


module.exports = {
    createIdentity,
    resolveDID,
    registerDIDMethod
}
