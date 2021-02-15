
/*
    OpenDSU W3C compatible DID method
        - compatible with SeedSSIs (did:ssi:sRead:domain:specificString)
        - a set of APIs and an extensible resolver that can embed arbitrary resolvers ( did:ssi:w3c:domainAsMethod:specificString) masquerading as ledger domains for KeySSIs
 */



/*
    Create a new W3CDID based on SeedSSI
 */
function createOpenDSUIdentity(){

}

/*
    Returns an error or an instance of W3CDID
 */
function resolveDID(identifier, callback){

}


function registerDIDMethod(domainAsMethod, implementation){

}


module.exports = {
    createOpenDSUIdentity,
    resolveDID,
    registerDIDMethod
}