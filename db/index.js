let util = require("./impl/DSUDBUtil")
const {SingleDSUStorageStrategy} = require("./storageStrategies/SingleDSUStorageStrategy");
const {TimestampMergingStrategy: ConflictStrategy} = require("./conflictSolvingStrategies/timestampMergingStrategy");


function getBasicDB(storageStrategy, conflictSolvingStrategy) {
    let BasicDB = require("./impl/BasicDB");
    return new BasicDB(storageStrategy, conflictSolvingStrategy);
}

function getMultiUserDB(keySSI, dbName) {
    throw "Not implemented yet";
    let storageStrategy = require("./storageStrategies/MultiUserStorageStrategy");
    let conflictStrategy = require("./conflictSolvingStrategies/timestampMergingStrategy");
}

let getSharedDB = function (keySSI, dbName) {
    let SingleDSUStorageStrategy = require("./storageStrategies/SingleDSUStorageStrategy").SingleDSUStorageStrategy;
    let storageStrategy = new SingleDSUStorageStrategy();
    let ConflictStrategy = require("./conflictSolvingStrategies/timestampMergingStrategy").TimestampMergingStrategy;
    let db = getBasicDB(storageStrategy, new ConflictStrategy());

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

let getSimpleWalletDB = (dbName) => {
    let SingleDSUStorageStrategy = require("./storageStrategies/SingleDSUStorageStrategy").SingleDSUStorageStrategy;
    let storageStrategy = new SingleDSUStorageStrategy();
    let ConflictStrategy = require("./conflictSolvingStrategies/timestampMergingStrategy").TimestampMergingStrategy;
    let db = getBasicDB(storageStrategy, new ConflictStrategy());

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

const getMainEnclaveDB = (callback) => {
    const sc = require("opendsu").loadAPI("sc").getSecurityContext();
    if (sc.isInitialised()) {
        return sc.getMainEnclaveDB(callback);
    } else {
        sc.on("initialised", () => {
            sc.getMainEnclaveDB(callback);
        });
    }
}

const getSharedEnclaveDB = (callback) => {
    const sc = require("opendsu").loadAPI("sc").getSecurityContext();
    if (sc.isInitialised()) {
        sc.getSharedEnclaveDB(callback);
    } else {
        sc.on("initialised", () => {
            sc.getSharedEnclaveDB(callback);
        });
    }
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
    getSharedEnclave: getSharedEnclaveDB,
    getSharedEnclaveDB
}
