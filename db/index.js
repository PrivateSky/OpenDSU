

function getSelfSovereignDB(mountingPoint, sharedSSI, mySeedSSI){
    return new (require("./SSDB"))(mountingPoint, sharedSSI, mySeedSSI);
}

function getBasicDB(storageStrategy){
    return new (require("./BasicDB"))(storageStrategy);
}

function getBigFileStorageStrategy(readFunction, writeFunction){
    return new (require("./BigFileStorageStrategy"))(readFunction, writeFunction);
}


module.exports = {
    getSelfSovereignDB,
    getBasicDB,
    getBigFileStorageStrategy
}