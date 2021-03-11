
function getBasicSharedDB(readFunction, writeFunction, onInitialisationDone){
    return new (require("./BasicSharedDB"))(readFunction, writeFunction, onInitialisationDone);
}

function getBigFileStorageStrategy(readFunction, writeFunction, onInitialisationDone){
    return new (require("./BigFileStorageStrategy"))(readFunction, writeFunction, onInitialisationDone);
}

let getSharedDsuDB = require("./SharedDsuDB");

module.exports = {
    getBasicSharedDB,
    getSharedDsuDB,
    getBigFileStorageStrategy
}
