let util = require("./impl/DSUDBUtil")


function getBasicDB(storageStrategy, conflictSolvingStrategy){
    let BasicDB = require("./impl/BasicDB");
    return new BasicDB(storageStrategy, conflictSolvingStrategy);
}

function getMultiUserDB(keySSI, dbName){
    throw "Not implemented yet";
    let storageStrategy = require("./storageStrategies/MultiUserStorageStrategy");
    let conflictStrategy = require("./conflictSolvingStrategies/timestampMergingStrategy");
}

let getSharedDB = function(keySSI, dbName){
    let SingleDSUStorageStrategy = require("./storageStrategies/SingleDSUStorageStrategy").SingleDSUStorageStrategy;
    let storageStrategy = new SingleDSUStorageStrategy();
    let ConflictStrategy = require("./conflictSolvingStrategies/timestampMergingStrategy").TimestampMergingStrategy;
    let db = getBasicDB(storageStrategy, new ConflictStrategy());

    util.ensure_WalletDB_DSU_Initialisation(keySSI, dbName, function(err, _storageDSU, sharableSSI){
        if (err) {
            return OpenDSUSafeCallback()(createOpenDSUErrorWrapper("Failed to initialise WalletDB_DSU " + dbName, err));
        }
        storageStrategy.initialise(_storageDSU, dbName);
        console.log("Finishing initialisation");

        db.getShareableSSI = function(){
                return sharableSSI;
        };
    })

    return db;
};

module.exports = {
    getBasicDB,
    getWalletDB: getSharedDB,
    getMultiUserDB,
    getSharedDB
}
