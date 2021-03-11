
/*
    A shared DB is a baseDB stored in a writable DSU mounted in a /.data folder in another wrapper DSU.
    This scheme is useful to share the database without sharing the SeedSSI of the wrapper DSU as this is usually used for signing, etc
 */
function getSharedDsuDB(originalKeySSI, dbName = 'shared'){
  let db;
  let dbModule = require("./index.js");
  let storageDSU;
  let shareableSSI;
  let skipFirstRead = false;
  let pendingReadFunctionCallback = undefined;

  let doStorageDSUInitialisation = registerMandatoryCallback(
    function (dsu, ssi, skipFirstRead) {
      storageDSU = dsu;
      shareableSSI = ssi;
      if(pendingReadFunctionCallback){
        if (!skipFirstRead) {
          console.log("Reading state during initialisation for:", originalKeySSI.getAnchorId());
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
  // let bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;

  if(originalKeySSI.getTypeName() === constants.KEY_SSIS.SEED_SSI){
    function createWritableDSU(){
      let writableSSI = keySSIApis.createTemplateKeySSI(constants.KEY_SSIS.SEED_SSI, keySSI.getDLDomain());
      resolver.createDSU(writableSSI, function(err, writableDSU){
        createWrapperDSU(writableDSU);
      });
    }
    function createWrapperDSU(writableDSU){
      resolver.createDSUForExistingSSI(keySSI, function(err, res){
        res.mount("/.data", writableDSU.getCreationSSI(), function(err, resSSI){
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
    resolver.loadDSU(originalKeySSI, function(err, res){
      if(err){
        reportUserRelevantError("Failed to load the DSU of a shared database " + dbName, err);
      }
      doStorageDSUInitialisation(res, originalKeySSI, false);
      reportUserRelevantWarning("Loading a shared database");
    });
  }


  function readFunction(userSReadSSI, callback){
    if(storageDSU){
      if(skipFirstRead) {
        callback(undefined, "{}");
      } else {
        console.log("Reading state for:",originalKeySSI.getAnchorId());
        storageDSU.readFile(`/.data/${userSReadSSI}`, callback);
      }
    } else {
      pendingReadFunctionCallback = callback;
    }
  }

  function writeFunction(dbState, userSReadSSI, callback){
    storageDSU.writeFile(`/.data/${userSReadSSI}`, dbState, callback);
  }

  db = dbModule.getBasicSharedDB(readFunction, writeFunction, onInitialisationDone);

  function onInitialisationDone(){
    setTimeout(function(){
      db.finishInitialisation();
    },1)
  }

  db.getShareableSSI = function(){
    return shareableSSI;
  }

  db.addUserDSU = (userKeySSI, callback) => {
    resolver.loadDSU(userKeySSI, function(err, dsu) {
      if (err) {
        callback(err)
      }
      storageDSU.mount(`/.data/${userKeySSI}`, dsu.getCreationSSI(), (error, result) => {
        if (error) {
          callback(error)
        }

        reportUserRelevantWarning(`Adding user DSU into the shared database`)
        callback(null, result)
      })
    });
  }

  return db;
}

module.exports = getSharedDsuDB;
