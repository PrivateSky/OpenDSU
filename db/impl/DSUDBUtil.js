module.exports = {
    ensure_WalletDB_DSU_Initialisation: function (keySSI, dbName, callback) {
        let resolver = require("../../resolver");
        let keySSIApis = require("../../keyssi");
        let constants = require("../../moduleConstants");

        let doStorageDSUInitialisation = registerMandatoryCallback(
            function (dsu, sharableSSI) {
                callback(undefined, dsu, sharableSSI);
            }, 10000);

        if (typeof keySSI === "string") {
            try {
                keySSI = keySSIApis.parse(keySSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${keySSI}`, e));
            }
        }
        resolver.loadDSU(keySSI, (err, dsuInstance) => {
            if ((err || !dsuInstance) && keySSI.getTypeName() === constants.KEY_SSIS.SEED_SSI) {
                return createSeedDSU();
            }

            waitForWritableSSI(dsuInstance);
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
                            keySSI.derive((err, derivedKeySSI)=>{
                                if (err) {
                                    return callback(createOpenDSUErrorWrapper(`Failed to derive keySSI ${keySSI.getIdentifier()}`, err));
                                }
                                doStorageDSUInitialisation(writableDSU, derivedKeySSI);
                            })
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
    initialiseWalletDB: function (dbName, keySSI, callback) {
        if (typeof keySSI === "function") {
            callback = keySSI;
            keySSI = undefined;
        }
        const openDSU = require("opendsu");
        let resolver = openDSU.loadAPI("resolver");
        let scAPI = openDSU.loadAPI("sc");
        let keySSISpace = openDSU.loadAPI("keyssi");
        let storageDSU;
        const DB_KEY_SSI_PATH = `/db/${dbName}`;
        scAPI.getMainDSU(async (err, mainDSU) => {
            if (err) {
                return callback(err);
            }

            if(!keySSI){
                try {
                    keySSI = await $$.promisify(mainDSU.readFile)(DB_KEY_SSI_PATH);
                    keySSI = keySSI.toString();

                } catch (e) {
                    let vaultDomain;
                    try {
                        vaultDomain = await $$.promisify(scAPI.getVaultDomain)();
                    } catch (e) {
                        return callback(createOpenDSUErrorWrapper(`Failed to get vault domain`, e));
                    }
                    try {
                        storageDSU = await $$.promisify(resolver.createSeedDSU)(vaultDomain);
                    } catch (e) {
                        return callback(createOpenDSUErrorWrapper(`Failed to create Seed DSU`, e));
                    }

                    try {
                        keySSI = await $$.promisify(storageDSU.getKeySSIAsObject)();
                    } catch (e) {
                        return callback(createOpenDSUErrorWrapper(`Failed to get storageDSU's keySSI`, e));
                    }

                    try {
                        await $$.promisify(mainDSU.writeFile)(DB_KEY_SSI_PATH, keySSI.getIdentifier());
                    } catch (e) {
                        return callback(createOpenDSUErrorWrapper(`Failed to store key SSI in mainDSU for db <${dbName}>`, e));
                    }

                    return callback(undefined, storageDSU, keySSI);
                }
            }

            try {
                storageDSU = await $$.promisify(resolver.loadDSU)(keySSI)
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to load storage DSU for db <${dbName}>`, e));
            }

            if(typeof keySSI === "string") {
                try{
                    keySSI = keySSISpace.parse(keySSI);
                }catch (e) {
                    return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI <${keySSI}>`, e));
                }
            }
            try {
                await $$.promisify(mainDSU.writeFile)(DB_KEY_SSI_PATH, keySSI.getIdentifier());
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to store key SSI in mainDSU for db <${dbName}>`, e));
            }

            return callback(undefined, storageDSU, keySSI);
        })
    },
    ensure_MultiUserDB_DSU_Initialisation: function (keySSI, dbName, userId, callback) {
    }
}
