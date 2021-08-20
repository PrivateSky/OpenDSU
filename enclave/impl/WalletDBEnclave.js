const {createOpenDSUErrorWrapper} = require("../../error");
const {callContractEndpoint} = require("../../contracts/utils");

function WalletDBEnclave() {
    const openDSU = require("opendsu");
    const crypto = openDSU.loadAPI("crypto");
    const db = openDSU.loadAPI("db")
    const keySSISpace = openDSU.loadAPI("keyssi")
    const w3cDID = openDSU.loadAPI("w3cdid")
    const scAPI = openDSU.loadAPI("sc");
    const ELEMENT_TYPES = require("./elementTypes");

    const DB_NAME = "walletdb_enclave";
    const KEY_SSIS_TABLE = "keyssis";
    const SEED_SSIS_TABLE = "seedssis";
    const DIDS_PRIVATE_KEYS = "dids_private";
    const DIDS_PUBLIC_KEYS = "dids_public";

    const ObservableMixin = require("../../utils/ObservableMixin");
    ObservableMixin(this);

    let storageDB;
    let enclaveDID;
    const init = () => {
        scAPI.getMainDSU(async (err, mainDSU) => {
            if (err) {
                throw createOpenDSUErrorWrapper(`Failed to get mainDSU`, err);
            }
            let keySSI;
            try {
                keySSI = await $$.promisify(mainDSU.getKeySSIAsObject)();
            } catch (e) {
                throw createOpenDSUErrorWrapper(`Failed to get mainDSU's keySSI`, e);
            }
            storageDB = db.getWalletDB(keySSI, DB_NAME);
            storageDB.on("initialised", () => {
                this.finishInitialisation();
                this.dispatchEvent("initialised");
            })
        })

    };

    const getPrivateInfoForDID = (did, callback) => {
        storageDB.getRecord(DIDS_PRIVATE_KEYS, did, (err, record) => {
            if (err) {
                return callback(err);
            }

            const privateKeysAsBuff = record.privateKeys.map(privateKey => {
                if (privateKey) {
                    return $$.Buffer.from(privateKey)
                }

                return privateKey;
            });
            callback(undefined, privateKeysAsBuff);
        });
    }

    const getCapableOfSigningKeySSI = (keySSI, callback) => {
        if (!apiIsAvailable(callback)) {
            return;
        }
        if (typeof keySSI === "undefined") {
            return callback(Error(`A SeedSSI should be specified.`));
        }

        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${keySSI}`, e))
            }
        }

        storageDB.getRecord(KEY_SSIS_TABLE, keySSI.getIdentifier(), (err, record) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`No capable of signing keySSI found for keySSI ${keySSI.getIdentifier()}`, err));
            }

            let keySSI;
            try {
                keySSI = keySSISpace.parse(record.capableOfSigningKeySSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${record.capableOfSigningKeySSI}`, e))
            }

            callback(undefined, keySSI);
        });
    };

    this.getEnclaveDID = () => {

    }

    this.insertRecord = (forDID, table, pk, encryptedObject, indexableFieldsNotEncrypted, callback) => {
        storageDB.insertRecord(table, pk, indexableFieldsNotEncrypted, callback);
    }

    this.updateRecord = (forDID, table, pk, encryptedObject, indexableFieldsNotEncrypted, callback) => {
        storageDB.updateRecord(table, pk, indexableFieldsNotEncrypted, callback);
    }

    this.getRecord = (forDID, table, pk, callback) => {
        storageDB.getRecord(table, pk, callback);
    };

    this.filter = (forDID, table, filter, sort, limit, callback) => {
        storageDB.filter(table, filter, sort, limit, callback);
    }

    this.deleteRecord = (forDID, table, pk, callback) => {
        storageDB.deleteRecord(table, pk, callback);
    }


    this.storeSeedSSI = (forDID, seedSSI, alias, callback) => {
        if (typeof seedSSI === "string") {
            try {
                seedSSI = keySSISpace.parse(seedSSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${seedSSI}`, e))
            }
        }

        const keySSIIdentifier = seedSSI.getIdentifier();

        function registerDerivedKeySSIs(derivedKeySSI) {
            storageDB.insertRecord(KEY_SSIS_TABLE, derivedKeySSI.getIdentifier(), {capableOfSigningKeySSI: keySSIIdentifier}, (err) => {
                if (err) {
                    return callback(err);
                }

                try {
                    derivedKeySSI = derivedKeySSI.derive();
                } catch (e) {
                    return callback();
                }

                registerDerivedKeySSIs(derivedKeySSI);
            });
        }

        storageDB.insertRecord(forDID, SEED_SSIS_TABLE, alias, {seedSSI: keySSIIdentifier}, (err) => {
            if (err) {
                return callback(err);
            }

            return registerDerivedKeySSIs(seedSSI);
        })
    }

    this.storeDID = (forDID, storedDID, privateKeys, callback) => {
        storageDB.getRecord(DIDS_PRIVATE_KEYS, storedDID.getIdentifier(), (err, res) => {
            if (err || !res) {
                return storageDB.insertRecord(DIDS_PRIVATE_KEYS, storedDID.getIdentifier(), {privateKeys: privateKeys}, callback);
            }

            privateKeys.forEach(privateKey => {
                res.privateKeys.push(privateKey);
            })
            storageDB.updateRecord(DIDS_PRIVATE_KEYS, storedDID.getIdentifier(), res, callback);
        });
    }

    this.generateDID = (forDID, didMethod, ...args) => {

    }

    this.storePrivateKey = (forDID, privateKey, type, alias, callback) => {

    }

    this.storeSecretKey = (forDID, secretKey, alias, callback) => {

    };

    this.generateSecretKey = (forDID, secretKeyAlias, callback) => {

    }

    this.signForDID = (forDID, didThatIsSigning, hash, callback) => {
        getPrivateInfoForDID(didThatIsSigning.getIdentifier(), (err, privateKey) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${didThatIsSigning.getIdentifier()}`, err));
            }
            didThatIsSigning.signImpl(privateKey, hash, callback);
        });
    }

    this.signForKeySSI = (forDID, keySSI, hash, callback) => {
        getCapableOfSigningKeySSI(keySSI, (err, capableOfSigningKeySSI) => {
            if (err) {
                return callback(err);
            }

            capableOfSigningKeySSI.sign(hash, callback);
        });
    }

    this.encryptAES = (forDID, secretKeyAlias, message, AESParams, callback) => {

    }

    this.encryptMessage = (forDID, didFrom, didTo, message, callback) => {
        getPrivateInfoForDID(didFrom.getIdentifier(), (err, privateKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${didFrom.getIdentifier()}`, err));
            }

            didFrom.encryptMessageImpl(privateKeys, didTo, message, callback);
        });
    }

    this.decryptMessage = (forDID, didTo, encryptedMessage, callback) => {
        getPrivateInfoForDID(didTo.getIdentifier(), (err, privateKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${didTo.getIdentifier()}`, err));
            }

            didTo.decryptMessageImpl(privateKeys, encryptedMessage, callback);
        });
    };

    const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    bindAutoPendingFunctions(this, ["on", "off"]);

    init();
}

module.exports = WalletDBEnclave;