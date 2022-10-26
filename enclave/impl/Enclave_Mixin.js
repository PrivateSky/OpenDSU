const constants = require("./constants");
const EnclaveHandler = require("./WalletDBEnclaveHandler");
const PathKeyMapping = require("./PathKeyMapping");

function Enclave_Mixin(target, did, keySSI) {
    const openDSU = require("opendsu");
    const keySSISpace = openDSU.loadAPI("keyssi")
    const w3cDID = openDSU.loadAPI("w3cdid")
    const errorAPI = openDSU.loadAPI("error");

    const ObservableMixin = require("../../utils/ObservableMixin");
    ObservableMixin(target);
    const CryptoSkills = w3cDID.CryptographicSkills;

    let pathKeyMapping;

    const getPrivateInfoForDID = (did, callback) => {
        target.storageDB.getRecord(constants.TABLE_NAMES.DIDS_PRIVATE_KEYS, did, (err, record) => {
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

        target.storageDB.getRecord(constants.TABLE_NAMES.KEY_SSIS, keySSI.getIdentifier(), (err, record) => {
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

    const getPathKeyMapping = (callback) => {
        if (pathKeyMapping) {
            return callback(pathKeyMapping);
        }

        const EnclaveHandler = require("./WalletDBEnclaveHandler");
        const PathKeyMapping = require("../impl/PathKeyMapping");

        try {
            target.storageDB.getKeySSI((err, keySSI) => {
                if (err) {
                    return callback(err);
                }

                const enclaveHandler = new EnclaveHandler(keySSI);
                pathKeyMapping = new PathKeyMapping(enclaveHandler);
                callback(undefined, pathKeyMapping);
            })
        } catch (e) {
            return callback(e);
        }
    }

    target.getDID = (callback) => {
        if (!did) {
            did = CryptoSkills.applySkill("key", CryptoSkills.NAMES.CREATE_DID_DOCUMENT);
            did.on("initialised", () => {
                did = did.getIdentifier();
                callback(undefined, did);
            })
        } else {
            callback(undefined, did);
        }
    }

    target.refresh = (forDID, callback) => {
        if (typeof forDID === "function") {
            callback = forDID;
            forDID = undefined;
        }

        target.storageDB.refresh(callback);
    }

    target.getPrivateKeyForSlot = (forDID, slot, callback) => {
        target.storageDB.getRecord(constants.TABLE_NAMES.PATH_KEY_SSI_PRIVATE_KEYS, slot, (err, privateKeyRecord) => {
            if (err) {
                return callback(err);
            }
            let privateKey;
            try {
                privateKey = $$.Buffer.from(privateKeyRecord.privateKey);
            } catch (e) {
                return callback(e);
            }

            callback(undefined, privateKey);
        });
    };

    target.addIndex = (forDID, table, field, forceReindex, callback) => {
        if (typeof forceReindex === "function") {
            callback = forceReindex;
            forceReindex = false;
        }
        target.storageDB.addIndex(table, field, forceReindex, callback);
    }

    target.getIndexedFields = (forDID, table, callback) => {
        target.storageDB.getIndexedFields(table, callback);
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
        const isExistingKeyError = (error) => error.originalMessage === errorAPI.DB_INSERT_EXISTING_RECORD_ERROR;

        function registerDerivedKeySSIs(derivedKeySSI, sReadSSIIdentifier) {
            target.storageDB.insertRecord(constants.TABLE_NAMES.KEY_SSIS, derivedKeySSI.getIdentifier(), {capableOfSigningKeySSI: keySSIIdentifier}, (err) => {
                if (err && !isExistingKeyError(err)) {
                    // ignore if KeySSI is already present
                    return callback(err);
                }
                target.storageDB.insertRecord(constants.TABLE_NAMES.SREAD_SSIS, derivedKeySSI.getIdentifier(), {sReadSSI: sReadSSIIdentifier}, (err) => {
                    if (err && !isExistingKeyError(err)) {
                        // ignore if sReadSSI is already present
                        return callback(err);
                    }

                    try {
                        derivedKeySSI.derive((err, _derivedKeySSI) => {
                            if (err) {
                                return callback(err);
                            }

                            registerDerivedKeySSIs(_derivedKeySSI, sReadSSIIdentifier);
                        })
                    } catch (e) {
                        return callback();
                    }
                });
            });
        }

        target.storageDB.insertRecord(constants.TABLE_NAMES.SEED_SSIS, alias, {seedSSI: keySSIIdentifier}, (err) => {
            if (err && !isExistingKeyError(err)) {
                // ignore if SeedSSI is already present
                return callback(err);
            }

            seedSSI.derive((err, sReadSSI) => {
                if (err) {
                    return callback(err);
                }

                const sReadSSIIdentifier = sReadSSI.getIdentifier();
                return registerDerivedKeySSIs(seedSSI, sReadSSIIdentifier);
            })
        })
    }

    target.storeKeySSI = (forDID, keySSI, callback) => {
        if (typeof keySSI === "function") {
            callback = keySSI;
            keySSI = forDID;
            forDID = undefined;
        }

        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${keySSI}`, e))
            }
        }

        if (keySSI.getTypeName() === openDSU.constants.KEY_SSIS.PATH_SSI) {
           return getPathKeyMapping((err, pathKeyMapping)=>{
                if (err) {
                    return callback(err);
                }

               pathKeyMapping.storePathKeySSI(keySSI, callback);
           })
        }

        if (keySSI.getTypeName() === openDSU.constants.KEY_SSIS.SEED_SSI) {
            return target.storeSeedSSI(forDID, keySSI, undefined, callback);
        }
        const keySSIIdentifier = keySSI.getIdentifier();

        target.storageDB.insertRecord(constants.TABLE_NAMES.KEY_SSIS, keySSIIdentifier, {keySSI: keySSIIdentifier}, callback)
    }

    target.storeReadForAliasSSI = (forDID, sReadSSI, aliasSSI, callback) => {
        if (typeof sReadSSI === "string") {
            try {
                sReadSSI = keySSISpace.parse(sReadSSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse SReadSSI ${sReadSSI}`, e))
            }
        }

        if (typeof aliasSSI === "string") {
            try {
                aliasSSI = keySSISpace.parse(aliasSSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse SReadSSI ${aliasSSI}`, e))
            }
        }
        const keySSIIdentifier = sReadSSI.getIdentifier();
        target.storageDB.insertRecord(constants.TABLE_NAMES.SREAD_SSIS, aliasSSI.getIdentifier(), {sReadSSI: keySSIIdentifier}, callback)
    }

    target.getReadForKeySSI = (forDID, keySSI, callback) => {
        if (typeof keySSI === "function") {
            callback = keySSI;
            keySSI = forDID;
            forDID = undefined;
        }

        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed to parse keySSI ${keySSI}`, e))
            }
        }

        getPathKeyMapping((err, pathKeyMapping)=>{
            if (err) {
                return target.storageDB.getRecord(constants.TABLE_NAMES.SREAD_SSIS, keySSI.getIdentifier(), (err, record) => {
                    if (err) {
                        return callback(err);
                    }

                    callback(undefined, record.sReadSSI);
                });
            }

            pathKeyMapping.getReadForKeySSI(keySSI, (err, readKeySSI) => {
                if (err) {
                    return target.storageDB.getRecord(constants.TABLE_NAMES.SREAD_SSIS, keySSI.getIdentifier(), (err, record) => {
                        if (err) {
                            return callback(err);
                        }

                        callback(undefined, record.sReadSSI);
                    });
                }

                callback(undefined, readKeySSI);
            })
        })
    }

    target.storeDID = (forDID, storedDID, privateKeys, callback) => {
        if (typeof privateKeys === "function") {
            callback = privateKeys;
            privateKeys = storedDID;
            storedDID = forDID;
        }
        if (!Array.isArray(privateKeys)) {
            privateKeys = [privateKeys];
        }

        target.storageDB.getRecord(constants.TABLE_NAMES.DIDS_PRIVATE_KEYS, storedDID.getIdentifier(), (err, res) => {
            if (err || !res) {
                return target.storageDB.insertRecord(constants.TABLE_NAMES.DIDS_PRIVATE_KEYS, storedDID.getIdentifier(), {privateKeys: privateKeys}, callback);
            }

            privateKeys.forEach(privateKey => {
                res.privateKeys.push(privateKey);
            })
            target.storageDB.updateRecord(constants.TABLE_NAMES.DIDS_PRIVATE_KEYS, storedDID.getIdentifier(), res, callback);
        });
    }

    target.addPrivateKeyForDID = (didDocument, privateKey, callback) => {
        const privateKeyObj = {privateKeys: [privateKey]}
        target.storageDB.getRecord(constants.TABLE_NAMES.DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), (err, res) => {
            if (err || !res) {
                return target.storageDB.insertRecord(constants.TABLE_NAMES.DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), privateKeyObj, callback);
            }

            res.privateKeys.push(privateKey);
            target.storageDB.updateRecord(constants.TABLE_NAMES.DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), res, callback);
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
        if (typeof hash === "function") {
            callback = hash;
            hash = didThatIsSigning;
            didThatIsSigning = forDID;
        }

        const privateKeys = didThatIsSigning.getPrivateKeys();
        if (typeof privateKeys[privateKeys.length - 1] === "undefined") {
            return getPrivateInfoForDID(didThatIsSigning.getIdentifier(), async (err, privateKeys) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${didThatIsSigning.getIdentifier()}`, err));
                }

                const signature = CryptoSkills.applySkill(didThatIsSigning.getMethodName(), CryptoSkills.NAMES.SIGN, hash, privateKeys[privateKeys.length - 1]);
                callback(undefined, signature);
            });
        }

        const signature = CryptoSkills.applySkill(didThatIsSigning.getMethodName(), CryptoSkills.NAMES.SIGN, hash, privateKeys[privateKeys.length - 1]);
        callback(undefined, signature);
    }

    target.verifyForDID = (forDID, didThatIsVerifying, hash, signature, callback) => {
        if (typeof hash === "function") {
            callback = signature;
            signature = hash;
            hash = didThatIsVerifying;
            didThatIsVerifying = forDID;
        }
        didThatIsVerifying.getPublicKey("pem", (err, publicKey) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read public key for did ${target.getIdentifier()}`, err));
            }

            const verificationResult = CryptoSkills.applySkill(didThatIsVerifying.getMethodName(), CryptoSkills.NAMES.VERIFY, hash, publicKey, signature);
            callback(undefined, verificationResult);
        });
    }

    target.signForKeySSI = (forDID, keySSI, hash, callback) => {
        getPathKeyMapping((err, pathKeyMapping)=>{
            if (err) {
                return getCapableOfSigningKeySSI(keySSI, (err, capableOfSigningKeySSI) => {
                    if (err) {
                        return callback(err);
                    }
                    if (typeof capableOfSigningKeySSI === "undefined") {
                        return callback(Error(`The provided SSI does not grant writing rights`));
                    }

                    capableOfSigningKeySSI.sign(hash, callback);
                });
            }

            pathKeyMapping.getCapableOfSigningKeySSI((err, capableOfSigningKeySSI)=>{
                if (err) {
                    return callback(err);
                }

                capableOfSigningKeySSI.sign(hash, callback);
            })
        })
    }

    target.encryptAES = (forDID, secretKeyAlias, message, AESParams, callback) => {

    }

    target.encryptMessage = (forDID, didFrom, didTo, message, callback) => {
        if (typeof message === "function") {
            callback = message;
            message = didTo;
            didTo = didFrom;
            didFrom = forDID;
        }
        getPrivateInfoForDID(didFrom.getIdentifier(), (err, privateKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${didFrom.getIdentifier()}`, err));
            }

            CryptoSkills.applySkill(didFrom.getMethodName(), CryptoSkills.NAMES.ENCRYPT_MESSAGE, privateKeys, didFrom, didTo, message, callback);
        });
    }

    target.decryptMessage = (forDID, didTo, encryptedMessage, callback) => {
        if (typeof encryptedMessage === "function") {
            callback = encryptedMessage;
            encryptedMessage = didTo;
            didTo = forDID;
        }
        getPrivateInfoForDID(didTo.getIdentifier(), (err, privateKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${didTo.getIdentifier()}`, err));
            }

            CryptoSkills.applySkill(didTo.getMethodName(), CryptoSkills.NAMES.DECRYPT_MESSAGE, privateKeys, didTo, encryptedMessage, callback);
        });
    };


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

    // expose w3cdid APIs
    Object.keys(w3cDID).forEach(fnName => {
        if (fnName.startsWith("we_")) {
            const trimmedFnName = fnName.slice(3);
            target[trimmedFnName] = (...args) => {
                args.shift();
                args.unshift(target);
                w3cDID[fnName](...args);
            }
        }
    })

    const resolverAPI = openDSU.loadAPI("resolver");

    target.createDSU = (forDID, keySSI, options, callback) => {
        if (typeof options === "function") {
            callback = options;
            options = undefined;
        }
        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(e);
            }
        }

        if (keySSI.isAlias()) {
            const scAPI = require("opendsu").loadAPI("sc");
            scAPI.getVaultDomain(async (err, vaultDomain) => {
                if (err) {
                    return callback(err);
                }

                let seedSSI;
                try {
                    seedSSI = await $$.promisify(target.createSeedSSI)(target, vaultDomain);
                    const sReadSSI = await $$.promisify(seedSSI.derive)();
                    await $$.promisify(target.storeReadForAliasSSI)(undefined, sReadSSI, keySSI);
                } catch (e) {
                    return callback(e);
                }

                resolverAPI.createDSUForExistingSSI(seedSSI, callback);
            })
            return
        }

        if (keySSI.isTemplate()) {
            target.createSeedSSI(undefined, keySSI.getDLDomain(), (err, seedSSI) => {
                if (err) {
                    return callback(err);
                }

                resolverAPI.createDSUForExistingSSI(seedSSI, callback);
            })
        } else {
            target.storeKeySSI(undefined, keySSI, (err) => {
                if (err) {
                    return callback(err);
                }

                resolverAPI.createDSU(keySSI, options, callback);
            })
        }
    }

    target.loadDSU = (forDID, keySSI, options, callback) => {
        if (typeof options === "function") {
            callback = options;
            options = undefined;
        }
        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(e);
            }
        }

        resolverAPI.loadDSU(keySSI, options, (err, dsu) => {
            if (err) {
                target.getReadForKeySSI(undefined, keySSI.getIdentifier(), (err, sReadSSI) => {
                    if (err) {
                        return callback(err);
                    }
                    resolverAPI.loadDSU(sReadSSI, options, callback);
                });

                return;
            }

            callback(undefined, dsu);
        })
    }
}

module.exports = Enclave_Mixin;