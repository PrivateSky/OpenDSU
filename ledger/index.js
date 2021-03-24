//expose the blockchain from PrivateSky to use DSU as storage for worldstate and history

const { promisify } = require("../utils/promise");

/*
    initialise a ledger that is intended to be resolved from a keySSI, the DSU state get anchored in the domain of the keySSI
 */
async function initialiseDSULedger(keySSI, constitutionKeySSI, callback) {
    /*
            ToDO: create a DSU for that keySSI
            mount in /code constitutionKeySSI
            create folders /worldState &  /history

         */
  
    const opendsu = require("opendsu");
    const resolver = opendsu.loadApi("resolver");

    try {
        const dsu = await promisify(resolver.createDSU)(keySSI);

        const createFolder = promisify(dsu.createFolder.bind(dsu));

        await promisify(dsu.mount.bind(dsu))("/code", constitutionKeySSI);

        await createFolder("/worldState");
        await createFolder("/history");

        callback();
    } catch (error) {
        console.error('Error while initialiseDSULedger', error);
        callback(error);
    }
}

/*
    initialise a ledger that is intended to be resolved from a BDNS name
 */
function initialisePublicDSULedger(blockchainDomain, constitutionKeySSI) {}

/*
    get a handler to a secret ledger
 */
function getDSULedger(keySSI) {
    // return DSULEdgerBase
}

/*
    get a handler to a shared ledger
 */
function getPublicLedger(blockchainDomain) {}

/*
    put an openDSU interface in front of the ledger
 */
function getDSULedgerAsDB(blockchainDomain) {}

module.exports = {
    initialiseDSULedger,
    initialisePublicDSULedger,
    getDSULedger,
    getPublicLedger,
    getDSULedgerAsDB,
};
