let util = require("./impl/DSUDBUtil")

function getBasicDB(storageStrategy, conflictSolvingStrategy, options) {
    let BasicDB = require("./impl/BasicDB");
    return new BasicDB(storageStrategy, conflictSolvingStrategy, options);
}

function getMultiUserDB(keySSI, dbName) {
    throw "Not implemented yet";
}

let getSharedDB = function (keySSI, dbName, options) {
    let SingleDSUStorageStrategy = require("./storageStrategies/SingleDSUStorageStrategy").SingleDSUStorageStrategy;
    let storageStrategy = new SingleDSUStorageStrategy();
    let ConflictStrategy = require("./conflictSolvingStrategies/timestampMergingStrategy").TimestampMergingStrategy;
    let db = getBasicDB(storageStrategy, new ConflictStrategy(), options);

    util.ensure_WalletDB_DSU_Initialisation(keySSI, dbName, function (err, _storageDSU, sharableSSI) {
        if (err) {
            return OpenDSUSafeCallback()(createOpenDSUErrorWrapper("Failed to initialise WalletDB_DSU " + dbName, err));
        }
        storageStrategy.initialise(_storageDSU, dbName);
        console.log("Finishing initialisation");

        db.getShareableSSI = function () {
            return sharableSSI;
        };
    })

    return db;
};

let getSimpleWalletDB = (dbName, options) => {
    let SingleDSUStorageStrategy = require("./storageStrategies/SingleDSUStorageStrategy").SingleDSUStorageStrategy;
    let storageStrategy = new SingleDSUStorageStrategy();
    let ConflictStrategy = require("./conflictSolvingStrategies/timestampMergingStrategy").TimestampMergingStrategy;
    let db = getBasicDB(storageStrategy, new ConflictStrategy(), options);

    util.initialiseWalletDB(dbName, (err, _storageDSU, keySSI) => {
        if (err) {
            return OpenDSUSafeCallback()(createOpenDSUErrorWrapper("Failed to initialise WalletDB_DSU " + dbName, err));
        }
        storageStrategy.initialise(_storageDSU, dbName);
        console.log("Finishing initialisation");

        db.getShareableSSI = function () {
            return keySSI;
        };
    })

    return db;
};

const getInMemoryDB = () => {
    const MemoryStorageStrategy = require("./storageStrategies/MemoryStorageStrategy");
    const storageStrategy = new MemoryStorageStrategy();
    return getBasicDB(storageStrategy);
}

const getEnclaveDB = () => {
    throw Error("Not implemented");
};

const mainEnclaveIsInitialised = ()=>{
    const sc = require("opendsu").loadAPI("sc");
    return sc.securityContextIsInitialised();
}

const getMainEnclaveDB = (callback) => {
    require("opendsu").loadAPI("sc").getMainEnclave(callback);
}

const getSharedEnclaveDB = (callback) => {
     require("opendsu").loadAPI("sc").getSharedEnclave(callback);
}
module.exports = {
    getBasicDB,
    getWalletDB(keySSI, dbName) {
        console.warn(`The function "getWalletDB is obsolete. Use getSimpleWalletDB instead`);
        return getSharedDB(keySSI, dbName);
    },
    getSimpleWalletDB,
    getMultiUserDB,
    getSharedDB,
    getInMemoryDB,
    getEnclaveDB,
    getMainEnclaveDB,
    getMainEnclave: getMainEnclaveDB,
    mainEnclaveIsInitialised,
    getSharedEnclave: getSharedEnclaveDB,
    getSharedEnclaveDB
}
