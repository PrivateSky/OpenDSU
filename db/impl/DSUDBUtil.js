module.exports = {
    ensure_WalletDB_DSU_Initialisation:function(keySSI,dbName, callback){
        let resolver = require("../../resolver");
        let keySSIApis = require("../../keyssi");
        let constants = require("../../moduleConstants");

        let doStorageDSUInitialisation = registerMandatoryCallback(
            function (dsu, sharableSSI) {
                callback(undefined, dsu, sharableSSI);
            }, 10000);

        if(keySSI.getTypeName() === constants.KEY_SSIS.SEED_SSI){
            let writableDSU;
            function createWritableDSU(){
                let writableSSI = keySSIApis.createTemplateKeySSI(constants.KEY_SSIS.SEED_SSI, keySSI.getDLDomain());
                resolver.createDSU(writableSSI, function(err,res){
                    if (err) {
                        return callback(createOpenDSUErrorWrapper("Failed to create writable DSU while initialising shared database " + dbName, err));
                    }
                    writableDSU = res;
                    createWrapperDSU();
                });
            }
            function createWrapperDSU(){
                resolver.createDSUForExistingSSI(keySSI, function(err,res){
                    if (err) {
                        return callback(createOpenDSUErrorWrapper("Failed to create wrapper DSU while initialising shared database " + dbName, err));
                    }
                    res.mount("/data", writableDSU.getCreationSSI(), function(err, resSSI){
                        if(err){
                            return callback(createOpenDSUErrorWrapper("Failed to mount writable DSU in wrapper DSU while initialising shared database " + dbName, err));
                        }
                        callback(undefined, res, keySSI.derive());
                    });
                });
            }
            reportUserRelevantWarning("Creating a new shared database");
            createWritableDSU();
        } else {
            resolver.loadDSU(keySSI, function(err,res){
                if(err){
                    callback(createOpenDSUErrorWrapper("Failed to load the DSU of a shared database " + dbName, err));
                }
                callback(undefined, res, keySSI);
                reportUserRelevantWarning("Loading a shared database");
            });
        }
    },
    ensure_MultiUserDB_DSU_Initialisation:function(keySSI,dbName, userId, callback){

    }
}