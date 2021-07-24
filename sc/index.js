/*
    Security Context related functionalities

 */

const constants = require("../moduleConstants");
const keySSISpace = require("opendsu").loadAPI("keyssi");

const getMainDSU = () => {
    if (!globalVariableExists("rawDossier")) {
        throw Error("Main DSU does not exist in the current context.");
    }
    return getGlobalVariable("rawDossier");
};

const setMainDSU = (mainDSU) => {
    return setGlobalVariable("rawDossier", mainDSU);
};

function SecurityContext(keySSI) {
    const openDSU = require("opendsu");
    const crypto = openDSU.loadAPI("crypto");
    const db = openDSU.loadAPI("db")
    const keySSISpace = openDSU.loadAPI("keyssi")

    const DB_NAME = "security_context";
    const KEY_SSIS_TABLE = "keyssis";
    const DIDS_PRIVATE_KEYS = "dids_private";
    const DIDS_PUBLIC_KEYS = "dids_public";

    let isInitialized = false;

    if (typeof keySSI === "string") {
        keySSI = keySSISpace.parse(keySSI);
    }

    let storageDB;

    const init = async () => {
        if (typeof keySSI === "undefined") {
            let mainDSU;
            try {
                mainDSU = getMainDSU();
            } catch (e) {
                keySSI = keySSISpace.createSeedSSI("default");
            }

            if (mainDSU) {
                try {
                    keySSI = await $$.promisify(loadSecurityContext)()
                } catch (e) {
                    try {
                        keySSI = await $$.promisify(createSecurityContext)();
                        await $$.promisify(saveSecurityContext)(keySSI);
                    } catch (e) {
                        throw createOpenDSUErrorWrapper(`Failed to create security context`, e);
                    }
                }
            }
        }

        storageDB = db.getWalletDB(keySSI, DB_NAME);
        this.finishInitialisation();
    }

    this.registerDID = (didDocument, callback) => {
        let privateKeys = didDocument.getPrivateKeys();
        if (!Array.isArray(privateKeys)) {
            privateKeys = [privateKeys]
        }
        storageDB.getRecord(DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), (err, res) => {
            if (err || !res) {
                return storageDB.insertRecord(DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), {privateKeys: privateKeys}, callback);
            }

            privateKeys.forEach(privateKey => {
                res.privateKeys.push(privateKey);
            })
            storageDB.updateRecord(DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), res, callback);
        });
    };

    this.addPrivateKeyForDID = (didDocument, privateKey, callback) => {
        const privateKeyObj = {privateKeys: [privateKey]}
        storageDB.getRecord(DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), (err, res) => {
            if (err || !res) {
                return storageDB.insertRecord(DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), privateKeyObj, callback);
            }

            res.privateKeys.push(privateKey);
            storageDB.updateRecord(DIDS_PRIVATE_KEYS, didDocument.getIdentifier(), res, callback);
        });
    }

    this.addPublicKeyForDID = (didDocument, publicKey, callback) => {
        const publicKeyObj = {publicKeys: [publicKey]}
        storageDB.getRecord(DIDS_PUBLIC_KEYS, didDocument.getIdentifier(), (err, res) => {
            if (err || !res) {
                return storageDB.insertRecord(DIDS_PUBLIC_KEYS, didDocument.getIdentifier(), publicKeyObj, callback);
            }

            res.publicKeys.push(publicKey);
            return storageDB.updateRecord(DIDS_PUBLIC_KEYS, didDocument.getIdentifier(), res, callback);
        });
    }

    this.getPrivateInfoForDID = (did, callback) => {
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
    };

    this.registerKeySSI = (keySSI, callback) => {
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

        const keySSIIdentifier = keySSI.getIdentifier();

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

        return registerDerivedKeySSIs(keySSI);
    };

    this.getCapableOfSigningKeySSI = (keySSI, callback) => {
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

    this.getKeySSI = (keySSI) => {
        if (typeof keySSI === "undefined") {
            throw Error(`A KeySSI should be specified.`)
        }

        if (typeof keySSI !== "string") {
            keySSI = keySSI.getIdentifier();
        }

        return keySSISpace.parse(keySSIs[keySSI]);
    };

    this.sign = (keySSI, data, callback) => {
        // temporary solution until proper implementation
        return callback(undefined, {signature: "", publicKey: ""});
        if (!isInitialized) {
            return this.addPendingCall(() => {
                this.sign(keySSI, data, callback);
            });
        }

        const powerfulKeySSI = this.getKeySSI(keySSI);
        crypto.sign(powerfulKeySSI, data, callback);
    }

    this.signAsDID = (didDocument, data, callback) => {
        this.getPrivateInfoForDID(didDocument.getIdentifier(), (err, privateKey) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${didDocument.getIdentifier()}`, err));
            }
            didDocument.signImpl(privateKey, data, callback);
        });
    }

    this.verifyForDID = (didDocument, data, signature, callback) => {
        didDocument.verifyImpl(data, signature, callback);
    }


    this.encryptForDID = (senderDIDDocument, receiverDIDDocument, message, callback) => {
        this.getPrivateInfoForDID(senderDIDDocument.getIdentifier(), (err, privateKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${senderDIDDocument.getIdentifier()}`, err));
            }

            senderDIDDocument.encryptMessageImpl(privateKeys, receiverDIDDocument, message, callback);
        });
    };

    this.decryptAsDID = (didDocument, encryptedMessage, callback) => {
        this.getPrivateInfoForDID(didDocument.getIdentifier(), (err, privateKeys) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${didDocument.getIdentifier()}`, err));
            }

            didDocument.decryptMessageImpl(privateKeys, encryptedMessage, callback);
        });
    };

    this.getDb = () => {
        return storageDB;
    }

    const bindAutoPendingFunctions = require("../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    bindAutoPendingFunctions(this);
    init();
    return this;
}

const getVaultDomain = (callback) => {
    const mainDSU = getMainDSU();
    mainDSU.readFile(constants.ENVIRONMENT_PATH, (err, environment) => {
        if (err) {
            return callback(createOpenDSUErrorWrapper(`Failed to read environment file`, err));
        }

        try {
            environment = JSON.parse(environment.toString())
        } catch (e) {
            return callback(createOpenDSUErrorWrapper(`Failed to parse environment data`, e));
        }

        callback(undefined, environment.domain);
    })
}

const loadSecurityContext = (callback) => {
    const mainDSU = getMainDSU();
    mainDSU.readFile(constants.SECURITY_CONTEXT, (err, securityContextKeySSI) => {
        if (err) {
            return callback(createOpenDSUErrorWrapper(`Failed to read security context keySSI`, err));
        }

        callback(undefined, securityContextKeySSI.toString());
    })
}

const saveSecurityContext = (scKeySSI, callback) => {
    if (typeof scKeySSI === "object") {
        scKeySSI = scKeySSI.getIdentifier();
    }
    const mainDSU = getMainDSU();
    mainDSU.writeFile(constants.SECURITY_CONTEXT, scKeySSI, (err) => {
        if (err) {
            return callback(createOpenDSUErrorWrapper(`Failed to save security context keySSI`, err));
        }

        callback(undefined);
    })
}

const createSecurityContext = (callback) => {
    getVaultDomain((err, vaultDomain) => {
        if (err) {
            return callback(createOpenDSUErrorWrapper(`Failed to get vault domain`, err));
        }

        keySSISpace.createSeedSSI(vaultDomain, callback);
    })
}

const getSecurityContext = (keySSI) => {
    if (typeof $$.sc === "undefined") {
        $$.sc = new SecurityContext(keySSI);
    }

    return $$.sc;
};
module.exports = {
    getMainDSU,
    setMainDSU,
    getSecurityContext
};
