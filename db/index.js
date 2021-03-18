let createSharableDB = require("./impl/SharableDB").createSharableDB;

function getBasicDB(storageStrategy, conflictSolvingStrategy){
    return new (require("./impl/BasicDB"))(storageStrategy, conflictSolvingStrategy);
}

function getWalletDB(keySSI, dbName){
    let BigFileStorageStrategy = require("./storageStrategies/BigFileStorageStrategy");
    let storageStrategy = new BigFileStorageStrategy();
    return createSharableDB(keySSI, dbName, storageStrategy, undefined);
}

function getMultiUserDB(keySSI, dbName){
    let storageStrategy = require("./storageStrategies/MultiUserStorageStrategy");
    let conflictStrategy = require("./conflictSolvingStrategies/timestampMergingStrategy");
    return createSharableDB(keySSI, dbName, storageStrategy, conflictStrategy);
}

module.exports = {
    getBasicDB,
    getWalletDB,
    getMultiUserDB
}
