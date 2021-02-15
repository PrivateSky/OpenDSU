//expose the blockchain from PrivateSky to use DSU as storage for worldstate and history



/*
    initialise a ledger that is intended to be resolved from a keySSI, the DSU state get anchored in the domain of the keySSIForIdenitication
 */
function initialiseSecretLedger(keySSIForIdentification, constitutionKeySSI){

}

/*
    initialise a ledger that is intended to be resolved from a BDNS name
 */
function initialiseSharedLedger(blockchainDomain, constitutionKeySSI){

}


/*
    get a handler to a secret ledger
 */
function getSecretLedger(keySSI){

}

/*
    get a handler to a shared ledger
 */
function getSharedLedger(blockchainDomain){

}


module.exports = {
    initialiseSecretLedger,
    initialiseSharedLedger,
    getSecretLedger,
    getSharedLedger
}
