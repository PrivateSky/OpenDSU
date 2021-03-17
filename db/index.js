
function getSelfSovereignDB(mountingPoint, sharedSSI, mySeedSSI){
    return new (require("./impl/SSDB"))(mountingPoint, sharedSSI, mySeedSSI);
}

function getBasicDB(storageStrategy){
    return new (require("./impl/BasicDB"))(storageStrategy);
}

let createSharableDB = require("./impl/SharableDB").createSharableDB;

function getBasicDB(storageStrategy, conflictSolvingStrategy){
    return new (require("./impl/BasicDB"))(storageStrategy, conflictSolvingStrategy);
}

function getWalletDB(keySSI, dbName){
    let storageStrategy = require("./storageStrategies/BigFileStorageStrategy");
    return createSharableDB(keySSI, dbName, storageStrategy, undefined);
}

function getMultiUserDB(keySSI, dbName){
    let storageStrategy = require("./storageStrategies/MultiUserStorageStrategy");
    let conflictStrategy = require("./storageStrategies/timestampMergingStrategy");
    return createSharableDB(keySSI, dbName, storageStrategy, conflictStrategy);
}

module.exports = {
    getBasicDB,
    getWalletDB,
    getMultiUserDB
}
