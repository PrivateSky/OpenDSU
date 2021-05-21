module.exports = {
    ensure_WalletDB_DSU_Initialisation: function (keySSI, dbName, callback) {
        let resolver = require("../../resolver");
        let keySSIApis = require("../../keyssi");
        let constants = require("../../moduleConstants");

        let doStorageDSUInitialisation = registerMandatoryCallback(
            function (dsu, sharableSSI) {
                callback(undefined, dsu, sharableSSI);
            }, 10000);

        resolver.loadDSU(keySSI, (err, dsuInstance) => {
            if ((err || !dsuInstance) && keySSI.getTypeName() === constants.KEY_SSIS.SEED_SSI) {
              return  createSeedDSU();
            }

            if (keySSI.getTypeName() === constants.KEY_SSIS.SEED_SSI) {
                dsuInstance.getKeySSIAsString((err, seedSSI) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper("Failed to get seedSSI", err));
                    }

                    doStorageDSUInitialisation(dsuInstance, seedSSI);
                });
            }else{
                waitForWritableSSI(dsuInstance)
            }

        });

        function createSeedDSU() {
            let writableDSU;

            function createWritableDSU() {
                let writableSSI = keySSIApis.createTemplateKeySSI(constants.KEY_SSIS.SEED_SSI, keySSI.getDLDomain());
                resolver.createDSU(writableSSI, function (err, res) {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper("Failed to create writable DSU while initialising shared database " + dbName, err));
                    }
                    writableDSU = res;
                    createWrapperDSU();
                });
            }

            function createWrapperDSU() {
                resolver.createDSUForExistingSSI(keySSI, function (err, res) {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper("Failed to create wrapper DSU while initialising shared database " + dbName, err));
                    }
                    res.beginBatch();
                    res.mount("/data", writableDSU.getCreationSSI(), function (err, resSSI) {
                        if (err) {
                            return callback(createOpenDSUErrorWrapper("Failed to mount writable DSU in wrapper DSU while initialising shared database " + dbName, err));
                        }
                        res.commitBatch((err) => {
                            if (err) {
                                return callback(createOpenDSUErrorWrapper("Failed to anchor batch", err));
                            }
                            doStorageDSUInitialisation(writableDSU, keySSI.derive());
                        });
                    });
                });
            }

            reportUserRelevantWarning("Creating a new shared database");
            createWritableDSU();
        }

        function waitForWritableSSI(dsuInstance) {
            dsuInstance.getArchiveForPath("/data/dsu-metadata-log", (err, result) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper("Failed to load writable DSU " + dbName, err));
                }

                const keyssiAPI = require("opendsu").loadAPI("keyssi");
                const writableSSI = keyssiAPI.parse(result.archive.getCreationSSI());
                if (writableSSI.getTypeName() === "sread") {
                    console.log("Delaying the loading of DSU based on the fact that current stare not reflecting a DB dsu type structure");
                    return setTimeout(() => {
                        dsuInstance.load(waitForWritableSSI);
                    }, 1000);
                }

                doStorageDSUInitialisation(result.archive, keySSI);
                reportUserRelevantWarning("Loading a shared database");
            });
        }

    },
    ensure_MultiUserDB_DSU_Initialisation: function (keySSI, dbName, userId, callback) {
    }
}
