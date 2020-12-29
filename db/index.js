
function getSelfSovereignDB(mountingPoint, sharedSSI, mySeedSSI){
    return new (require("./SSDB"))(mountingPoint, sharedSSI, mySeedSSI);
}

function getBasicDB(storageStrategy){
    return new (require("./BasicDB"))(storageStrategy);
}

function getBigFileStorageStrategy(readFunction, writeFunction, onInitialisationDone){
    return new (require("./BigFileStorageStrategy"))(readFunction, writeFunction, onInitialisationDone);
}

let getSharedDB = require("./SharedDB").getSharedDB;

module.exports = {
    getSelfSovereignDB,
    getBasicDB,
    getSharedDB,
    getBigFileStorageStrategy
}
