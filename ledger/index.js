//expose the blockchain from PrivateSky to use DSU as storage for worldstate and history



/*
    initialise a ledger that is intended to be resolved from a keySSI, the DSU state get anchored in the domain of the keySSI
 */
function initialiseDSULedger(keySSI, constitutionKeySSI){
    /*
            ToDO: create a DSU for that keySSI
            mount in /code constitutionKeySSI
            create folders /worldState &  /history

         */
}

/*
    initialise a ledger that is intended to be resolved from a BDNS name
 */
function initialisePublicDSULedger(blockchainDomain, constitutionKeySSI){

}


/*
    get a handler to a secret ledger
 */
function getDSULedger(keySSI){

}

/*
    get a handler to a shared ledger
 */
function getPublicLedger(blockchainDomain){

}


/*
    put an openDSU interface in front of the ledger
 */
function getDSULedgerAsDB(blockchainDomain){

}

module.exports = {
    initialiseDSULedger,
    initialisePublicDSULedger,
    getSecretLedger,
    getSharedLedger,
    getDSULedgerAsDB
}
