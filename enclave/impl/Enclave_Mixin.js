function Enclave_Mixin(target, did) {
    const openDSU = require("opendsu");
    const keySSISpace = openDSU.loadAPI("keyssi")
    const w3cDID = openDSU.loadAPI("w3cdid")
    const KEY_SSIS_TABLE = "keyssis";
    const SEED_SSIS_TABLE = "seedssis";
    const DIDS_PRIVATE_KEYS = "dids_private";
    const ObservableMixin = require("../../utils/ObservableMixin");
    ObservableMixin(target);
    const CryptoSkills = w3cDID.CryptographicSkills;

    const getPrivateInfoForDID = (did, callback) => {
        target.storageDB.getAllRecords(DIDS_PRIVATE_KEYS, (err, records) => {
            if (err) {
                return callback(err);
            }
            console.log(records);
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
        });
    };

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

    target.getDID = (callback) => {
        if (!did) {
            did = CryptoSkills.applySkill("key", CryptoSkills.NAMES.CREATE_DID_DOCUMENT).getIdentifier();
        }
        callback(undefined, did);
    }

    target.insertRecord = (forDID, table, pk, plainRecord, encryptedRecord, callback) => {
        if (typeof encryptedRecord === "function") {
            callback = encryptedRecord;
            encryptedRecord = plainRecord;
        }
        target.storageDB.insertRecord(table, pk, encryptedRecord, callback);
    }

    target.updateRecord = (forDID, table, pk, plainRecord, encryptedRecord, callback) => {
        if (typeof encryptedRecord === "function") {
            callback = encryptedRecord;
            encryptedRecord = plainRecord;
        }
        target.storageDB.updateRecord(table, pk, encryptedRecord, callback);
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

    target.beginBatch = (forDID) => {
        target.storageDB.beginBatch();
    }

    target.commitBatch = (forDID, callback) => {
        target.storageDB.commitBatch(callback);
    }

    target.cancelBatch = (forDID, callback) => {
        target.storageDB.cancelBatch(callback);
    }

    target.readKey = (forDID, key, callback) => {
        target.storageDB.readKey(key, callback);
    }

    target.writeKey = (forDID, key, value, callback) => {
        target.storageDB.writeKey(key, value, callback);
    }

    target.getAllRecords = (forDID, tableName, callback) => {
        target.storageDB.getAllRecords(tableName, callback);
    }

    target.storeSeedSSI = (forDID, seedSSI, alias, callback) => {
        if (typeof seedSSI === "string") {
            try {
                seedSSI = keySSISpace.parse(seedSSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${seedSSI}`, e))
            }
        }

        if (typeof alias === "function") {
            callback = alias;
            alias = undefined;
        }

        if (typeof alias === "undefined") {
            const generateUid = require("swarmutils").generateUid;
            alias = generateUid(10).toString("hex");
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

    target.storeKeySSI = (forDID, keySSI, callback) => {
        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${keySSI}`, e))
            }
        }
        if (keySSI.getTypeName() === openDSU.constants.KEY_SSIS.SEED_SSI) {
            return target.storeSeedSSI(forDID, keySSI, undefined, callback);
        }
        const keySSIIdentifier = keySSI.getIdentifier();

        target.storageDB.insertRecord(KEY_SSIS_TABLE, keySSIIdentifier, {keySSI: keySSIIdentifier}, callback)
    }

    target.storeDID = (forDID, storedDID, privateKeys, callback) => {
        if (!Array.isArray(privateKeys)) {
            privateKeys = [privateKeys];
        }

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
        getPrivateInfoForDID(didThatIsSigning.getIdentifier(), async (err, privateKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${didThatIsSigning.getIdentifier()}`, err));
            }

            const signature = CryptoSkills.applySkill(didThatIsSigning.getMethodName(), CryptoSkills.NAMES.SIGN, hash, privateKeys[privateKeys.length - 1]);
            callback(undefined, signature);
        });
    }

    target.verifyForDID = (forDID, didThatIsVerifying, hash, signature, callback) => {
        didThatIsVerifying.getPublicKey("pem", (err, publicKey) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read public key for did ${target.getIdentifier()}`, err));
            }

            const verificationResult = CryptoSkills.applySkill(didThatIsVerifying.getMethodName(), CryptoSkills.NAMES.VERIFY, hash, publicKey, signature);
            callback(undefined, verificationResult);
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

            CryptoSkills.applySkill(didFrom.getMethodName(), CryptoSkills.NAMES.ENCRYPT_MESSAGE, privateKeys, didFrom, didTo, message, callback);
        });
    }

    target.decryptMessage = (forDID, didTo, encryptedMessage, callback) => {
        getPrivateInfoForDID(didTo.getIdentifier(), (err, privateKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${didTo.getIdentifier()}`, err));
            }

            CryptoSkills.applySkill(didTo.getMethodName(), CryptoSkills.NAMES.DECRYPT_MESSAGE, privateKeys, didTo, encryptedMessage, callback);
        });
    };

    // expose resolver APIs
    const resolverAPI = openDSU.loadAPI("resolver");
    Object.keys(resolverAPI).forEach(fnName => {
        target[fnName] = resolverAPI[fnName];
    })

    // expose keyssi APIs
    Object.keys(keySSISpace).forEach(fnName => {
        if (fnName.startsWith("we_")) {
            const trimmedFnName = fnName.slice(3);
            target[trimmedFnName] = (...args) => {
                args.shift();
                args.unshift(target);
                keySSISpace[fnName](...args);
            }
        } else if (fnName.startsWith("createTemplate")) {
            target[fnName] = keySSISpace[fnName];
        }
    })
}

module.exports = Enclave_Mixin;