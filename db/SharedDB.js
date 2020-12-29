

/*
    A shared DB is a baseDB stored in a writable DSU mounted in a /data folder in another wrapper DSU.
    This scheme is useful to share the database without sharing the SeedSSI of the wrapper DSU as this is usually used for signing, etc
 */
function getSharedDB(keySSI, dbName){
    let dbModule = require("./index.js");
    let storageDSU;
    let pendingRead;

    function doStorageDSUInitialisation(dsu){
        storageDSU = dsu;
        if(pendingRead){
            pendingRead()
        }
    }

    if(!dbName){
        throw new Error("Please provide a database name");
    }

    let resolver = require("../resolver");
    let keySSIApis = require("../keyssi");
    let constants = require("../moduleConstants");
    let bindAutoPendingFunctions = require("../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;

    if(keySSI.getTypeName() === constants.KEY_SSIS.SEED_SSI){
        let writableDSU;

        function createWritableDSU(){
            let writableSSI = keySSIApis.buildTemplateKeySSI(constants.KEY_SSIS.SEED_SSI, keySSI.getDLDomain);
            resolver.createDSU(writableSSI, function(err,res){
                writableDSU = res;
                createWrapperDSU();
            });
        }
        function createWrapperDSU(){
            resolver.createDSU(keySSI, function(err,res){
                doStorageDSUInitialisation(res);
                storageDSU.mount("/data", writableDSU.getKeySSI(), function(err,res){
                    if(err){
                        reportUserRelevantError("Failed to create writable DSU while initialising shared database " + dbName, err);
                    }
                });
            });
        }
    } else {
        resolver.loadDSU(keySSI, function(err,res){
            if(err){
                reportUserRelevantError("Failed to load thr DSU of a shared database " + dbName, err);
            }
            doStorageDSUInitialisation(res);
        });
    }


    function doRead(callback){
        storageDSU.readFile(`/data/${dbName}`, callback);
    }

    function readFunction(callback){
        if(storageDSU){
            doRead(callback);
        } else {
            pendingRead = function(){
                doRead(callback);
            }
        }
    }

    function writeFunction(dbState){
        storageDSU.writeFile(`/data/${dbName}`,dbState, callback);
    }
    let storageStrategy = dbModule.getBigFileStorageStrategy(readFunction, writeFunction, onInitialisationDone);
    function onInitialisationDone(){
        db.finishInitialisation();
    }

    let db = bindAutoPendingFunctions(dbModule.getBasicDB(storageStrategy), {});
    return db;
}

module.exports.getSharedDB = getSharedDB;