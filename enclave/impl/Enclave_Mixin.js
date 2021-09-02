
function Enclave_Mixin(target) {
    const openDSU = require("opendsu");
    const keySSISpace = openDSU.loadAPI("keyssi")
    const KEY_SSIS_TABLE = "keyssis";
    const SEED_SSIS_TABLE = "seedssis";
    const DIDS_PRIVATE_KEYS = "dids_private";
    const ObservableMixin = require("../../utils/ObservableMixin");
    ObservableMixin(target);

    let enclaveDID;

    const getPrivateInfoForDID = (did, callback) => {
        target.storageDB.getRecord(DIDS_PRIVATE_KEYS, did, (err, record) => {
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

        target.storageDB.getRecord(KEY_SSIS_TABLE, keySSI.getIdentifier(), (err, record) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`No capable of signing keySSI found for keySSI ${keySSI.getIdentifier()}`, err));
            }

            let capableOfSigningKeySSI;
            try {
                capableOfSigningKeySSI = keySSISpace.parse(record.capableOfSigningKeySSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${record.capableOfSigningKeySSI}`, e))
            }

            callback(undefined, capableOfSigningKeySSI);
        });
    };


    target.getEnclaveDID = () => {

    }

    target.insertRecord = (forDID, table, pk, encryptedObject, indexableFieldsNotEncrypted, callback) => {
        target.storageDB.insertRecord(table, pk, indexableFieldsNotEncrypted, callback);
    }

    target.updateRecord = (forDID, table, pk, encryptedObject, indexableFieldsNotEncrypted, callback) => {
        target.storageDB.updateRecord(table, pk, indexableFieldsNotEncrypted, callback);
    }

    target.getRecord = (forDID, table, pk, callback) => {
        target.storageDB.getRecord(table, pk, callback);
    };

    target.filter = (forDID, table, filter, sort, limit, callback) => {
        target.storageDB.filter(table, filter, sort, limit, callback);
    }

    target.deleteRecord = (forDID, table, pk, callback) => {
        target.storageDB.deleteRecord(table, pk, callback);
    }


    target.storeSeedSSI = (forDID, seedSSI, alias, callback) => {
        if (typeof seedSSI === "string") {
            try {
                seedSSI = keySSISpace.parse(seedSSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${seedSSI}`, e))
            }
        }

        const keySSIIdentifier = seedSSI.getIdentifier();

        function registerDerivedKeySSIs(derivedKeySSI) {
            target.storageDB.insertRecord(KEY_SSIS_TABLE, derivedKeySSI.getIdentifier(), {capableOfSigningKeySSI: keySSIIdentifier}, (err) => {
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

        target.storageDB.insertRecord(SEED_SSIS_TABLE, alias, {seedSSI: keySSIIdentifier}, (err) => {
            if (err) {
                return callback(err);
            }

            return registerDerivedKeySSIs(seedSSI);
        })
    }

    target.storeDID = (forDID, storedDID, privateKeys, callback) => {
        target.storageDB.getRecord(DIDS_PRIVATE_KEYS, storedDID.getIdentifier(), (err, res) => {
            if (err || !res) {
                return target.storageDB.insertRecord(DIDS_PRIVATE_KEYS, storedDID.getIdentifier(), {privateKeys: privateKeys}, callback);
            }

            privateKeys.forEach(privateKey => {
                res.privateKeys.push(privateKey);
            })
            target.storageDB.updateRecord(DIDS_PRIVATE_KEYS, storedDID.getIdentifier(), res, callback);
        });
    }

    target.addPrivateKeyForDID = (didDocument, privateKey, callback) => {
        const privateKeyObj = {privateKeys: [privateKey]}
        target.storageDB.getRecord(DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), (err, res) => {
            if (err || !res) {
                return target.storageDB.insertRecord(DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), privateKeyObj, callback);
            }

            res.privateKeys.push(privateKey);
            target.storageDB.updateRecord(DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), res, callback);
        });
    }

    target.generateDID = (forDID, didMethod, ...args) => {

    }

    target.storePrivateKey = (forDID, privateKey, type, alias, callback) => {

    }

    target.storeSecretKey = (forDID, secretKey, alias, callback) => {

    };

    target.generateSecretKey = (forDID, secretKeyAlias, callback) => {

    }

    target.signForDID = (forDID, didThatIsSigning, hash, callback) => {
        getPrivateInfoForDID(didThatIsSigning.getIdentifier(), (err, privateKey) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${didThatIsSigning.getIdentifier()}`, err));
            }
            didThatIsSigning.signImpl(privateKey, hash, callback);
        });
    }

    target.signForKeySSI = (forDID, keySSI, hash, callback) => {
        getCapableOfSigningKeySSI(keySSI, (err, capableOfSigningKeySSI) => {
            if (err) {
                return callback(err);
            }
            if (typeof capableOfSigningKeySSI === "undefined") {
                return callback(Error(`The provided SSI does not grant writing rights`));
            }

            capableOfSigningKeySSI.sign(hash, callback);
        });
    }

    target.encryptAES = (forDID, secretKeyAlias, message, AESParams, callback) => {

    }

    target.encryptMessage = (forDID, didFrom, didTo, message, callback) => {
        getPrivateInfoForDID(didFrom.getIdentifier(), (err, privateKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${didFrom.getIdentifier()}`, err));
            }

            didFrom.encryptMessageImpl(privateKeys, didTo, message, callback);
        });
    }

    target.decryptMessage = (forDID, didTo, encryptedMessage, callback) => {
        getPrivateInfoForDID(didTo.getIdentifier(), (err, privateKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${didTo.getIdentifier()}`, err));
            }

            didTo.decryptMessageImpl(privateKeys, encryptedMessage, callback);
        });
    };
}

module.exports = Enclave_Mixin;