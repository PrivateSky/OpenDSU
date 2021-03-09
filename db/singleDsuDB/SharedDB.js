
/*
    A shared DB is a baseDB stored in a writable DSU mounted in a /data folder in another wrapper DSU.
    This scheme is useful to share the database without sharing the SeedSSI of the wrapper DSU as this is usually used for signing, etc
 */
function getSharedDB(keySSI, dbName){
    let db;
    let dbModule = require("./index.js");
    let storageDSU;
    let shareableSSI;
    let skipFirstRead = false;
    let pendingReadFunctionCallback = undefined;

    if(!dbName){
        throw new Error("Please provide a database name");
    }

    let doStorageDSUInitialisation = registerMandatoryCallback(
            function (dsu, ssi, skip) {
            storageDSU = dsu;
            shareableSSI = ssi;
            skipFirstRead = skip;
            if(pendingReadFunctionCallback){
                if (!skipFirstRead) {
                    console.log("Reading state during initialisation for:",keySSI.getAnchorId());
                    readFunction(pendingReadFunctionCallback);
                } else {
                    pendingReadFunctionCallback(undefined, "{}");
                }
            }
            db.dispatchEvent("initialised", storageDSU);
        }, 10000);

    let resolver = require("../../resolver");
    let keySSIApis = require("../../keyssi");
    let constants = require("../../moduleConstants");
    let bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;

    if(keySSI.getTypeName() === constants.KEY_SSIS.SEED_SSI){
        let writableDSU;
        function createWritableDSU(){
            let writableSSI = keySSIApis.createTemplateKeySSI(constants.KEY_SSIS.SEED_SSI, keySSI.getDLDomain());
            resolver.createDSU(writableSSI, function(err,res){
                writableDSU = res;
                createWrapperDSU();
            });
        }
        function createWrapperDSU(){
            resolver.createDSUForExistingSSI(keySSI, function(err,res){
                res.mount("/data", writableDSU.getCreationSSI(), function(err, resSSI){
                    if(err){
                        return reportUserRelevantError("Failed to create writable DSU while initialising shared database " + dbName, err);
                    }
                    doStorageDSUInitialisation(res, keySSI.derive(), true);
                });
            });
        }
        reportUserRelevantWarning("Creating a new shared database");
        createWritableDSU();
    } else {
        resolver.loadDSU(keySSI, function(err,res){
            if(err){
                reportUserRelevantError("Failed to load the DSU of a shared database " + dbName, err);
            }
            doStorageDSUInitialisation(res, keySSI, false);
            reportUserRelevantWarning("Loading a shared database");
        });
    }


    function readFunction(callback){
        if(storageDSU){
            if(skipFirstRead) {
                callback(undefined, "{}");
            } else {
                console.log("Reading state for:",keySSI.getAnchorId());
                storageDSU.readFile(`/data/${dbName}`, callback);
            }
        } else {
            pendingReadFunctionCallback = callback;
        }
    }

    function writeFunction(dbState,callback){
        storageDSU.writeFile(`/data/${dbName}`,dbState, callback);
    }

    let storageStrategy = dbModule.getBigFileStorageStrategy(readFunction, writeFunction, onInitialisationDone);

    db = bindAutoPendingFunctions(dbModule.getBasicDB(storageStrategy), {});

    function onInitialisationDone(){
        setTimeout(function(){
            db.finishInitialisation();
        },1)
    }

    db.getShareableSSI = function(){
        return shareableSSI;
    }
    return db;
}

module.exports.getSharedDB = getSharedDB;
