const constants = require("../../moduleConstants");

function SecurityContext(target, PIN) {
    target = target || this;

    const ObservableMixin = require("../../utils/ObservableMixin");
    ObservableMixin(target);
    const openDSU = require("opendsu");
    const config = openDSU.loadAPI("config");
    const enclaveAPI = openDSU.loadAPI("enclave");
    const keySSIApi = openDSU.loadAPI("keyssi");
    const crypto = openDSU.loadAPI("crypto");
    let enclave;
    let sharedEnclave;
    let storageDSU;
    let scDSUKeySSI;
    let mainDID;
    let paddedPIN;

    let initialised = false;
    let pinNeeded = false;

    const initSharedEnclave = async () => {
        let sharedEnclaveType;
        let sharedEnclaveKeySSI;
        try {
            sharedEnclaveType = await $$.promisify(config.getEnv)(constants.SHARED_ENCLAVE.TYPE);
        } catch (e) {
            return;
        }
        if (!sharedEnclaveType) {
            return;
        }
        try {
            sharedEnclaveKeySSI = await $$.promisify(config.getEnv)(constants.SHARED_ENCLAVE.KEY_SSI);
        } catch (e) {
            if (sharedEnclaveType === constants.ENCLAVE_TYPES.WALLET_DB_ENCLAVE) {
                throw Error(`A key SSI should be provided when creating a WalletDB enclave`);
            }
        }

        if (PIN == undefined) {
            try {
                keySSIApi.parse(sharedEnclaveKeySSI);
                sharedEnclave = enclaveAPI.createEnclave(sharedEnclaveType, sharedEnclaveKeySSI);
                return sharedEnclave;
            }
            catch (err) {
                pinNeeded = true;
                sharedEnclave = new Promise((res, rej) => {
                    target.on("pinSet", async () => {
                        await initSharedEnclave();
                        pinNeeded = false;
                        res(sharedEnclave)
                    })
                })
                return;
            }
        } else {
            const decodedBase58 = crypto.decodeBase58(sharedEnclaveKeySSI);
            const decryptedKey = crypto.decrypt(decodedBase58, paddedPIN);
            const keySSI = crypto.encodeBase58(decryptedKey);
            try {
                sharedEnclave = enclaveAPI.createEnclave(sharedEnclaveType, keySSI);
            }
            catch (e) {
                throw Error(e);
            }
        }
    }

    target.init = async () => {
        let enclaveType;
        let enclaveDID;
        try {
            enclaveType = await $$.promisify(config.getEnv)(constants.MAIN_ENCLAVE.TYPE);
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to get env enclaveType`, e);
        }

        if (typeof enclaveType === "undefined") {
            enclaveType = constants.ENCLAVE_TYPES.MEMORY_ENCLAVE;
        }

        try {
            enclaveDID = await $$.promisify(config.getEnv)(constants.MAIN_ENCLAVE.DID);
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to get env enclaveDID`, e);
        }

        enclave = enclaveAPI.createEnclave(enclaveType);
        await initSharedEnclave();
        const __saveEnclaveDIDAndFinishInit = async () => {
            if (typeof enclaveDID === "undefined") {
                enclaveDID = await $$.promisify(enclave.getDID)();
                try {
                    await $$.promisify(config.setEnv)(constants.MAIN_ENCLAVE.DID, enclaveDID)
                } catch (e) {
                    throw createOpenDSUErrorWrapper(`Failed to set env enclaveDID`, e);
                }
            }

            if (!sharedEnclave || isPromise(sharedEnclave)) {
                return finishInit();
            }
            if (!sharedEnclave.isInitialised()) {
                sharedEnclave.on("initialised", () => {
                    finishInit();
                });
            } else {
                finishInit();
            }
        }

        if (enclave.isInitialised()) {
            __saveEnclaveDIDAndFinishInit()
        } else {
            enclave.on("initialised", async () => {
                __saveEnclaveDIDAndFinishInit();
            });
        }
    }

    const finishInit = () => {
        initialised = true;
        target.finishInitialisation();
        target.dispatchEvent("initialised")
    }

    target.registerDID = (didDocument, callback) => {
        let privateKeys = didDocument.getPrivateKeys();
        if (!Array.isArray(privateKeys)) {
            privateKeys = [privateKeys]
        }
        enclave.storeDID(didDocument, didDocument, privateKeys, callback);
    };

    target.addPrivateKeyForDID = (didDocument, privateKey, callback) => {
        enclave.addPrivateKeyForDID(didDocument, privateKey, callback);
    }

    target.registerKeySSI = (forDID, keySSI, callback) => {
        const generateUid = require("swarmutils").generateUid;
        const alias = generateUid(10).toString("hex");
        if (sharedEnclave) {
            sharedEnclave.storeSeedSSI(forDID, keySSI, alias, err => {
                if (err) {
                    return callback(err);
                }

                callback(undefined, alias);
            })
        } else {
            enclave.storeSeedSSI(forDID, keySSI, alias, err => {
                if (err) {
                    return callback(err);
                }

                callback(undefined, alias);
            })
        }
    };

    target.signForKeySSI = (forDID, keySSI, data, callback) => {
        enclave.signForKeySSI(forDID, keySSI, data, (err, signature) => {
            if (err) {
                sharedEnclave.signForKeySSI(forDID, keySSI, data, callback);
                return;
            }

            callback(undefined, signature);
        });
    }

    target.signAsDID = (didDocument, data, callback) => {
        enclave.signForDID(didDocument, didDocument, data, callback);
    }

    target.verifyForDID = (didDocument, data, signature, callback) => {
        enclave.verifyForDID(didDocument, didDocument, data, signature, callback);
    }


    target.encryptForDID = (senderDIDDocument, receiverDIDDocument, message, callback) => {
        enclave.encryptMessage(senderDIDDocument, senderDIDDocument, receiverDIDDocument, message, callback);
    };

    target.decryptAsDID = (didDocument, encryptedMessage, callback) => {
        enclave.decryptMessage(didDocument, didDocument, encryptedMessage, callback)
    }

    target.isInitialised = () => {
        return initialised;
    }

    target.getDB = (callback) => {
        const dbApi = openDSU.loadAPI("db");
        const db = dbApi.getWalletDB(scDSUKeySSI, "defaultDB")
        db.on("initialised", () => {
            callback(undefined, db);
        })
    }

    target.getDSU = (callback) => {
        callback(undefined, storageDSU);
    }

    const wrapEnclave = (asDID, enclave) => {
        const wrappedEnclave = {};
        let asyncDBMethods = ["insertRecord", "updateRecord", "getRecord", "deleteRecord", "filter", "commitBatch", "cancelBatch", "getKeySSI", "readKey", "writeKey", "getAllRecords", "addIndex"];
        for (let i = 0; i < asyncDBMethods.length; i++) {
            wrappedEnclave[asyncDBMethods[i]] = (...args) => {
                enclave[asyncDBMethods[i]](asDID, ...args);
            }

            wrappedEnclave[`${asyncDBMethods[i]}Async`] = $$.promisify(wrappedEnclave[asyncDBMethods[i]]);
        }

        Object.keys(enclave).forEach(methodName => {
            if (typeof wrappedEnclave[methodName] === "undefined") {
                wrappedEnclave[methodName] = (...args) => {
                    enclave[methodName](asDID, ...args);
                }
            }
        })
        return wrappedEnclave;
    }
    target.getMainEnclaveDB = (asDID, callback) => {
        if (typeof asDID === "function") {
            callback = asDID;
            asDID = mainDID;
        }

        let mainEnclaveDB;
        if (target.isInitialised()) {
            mainEnclaveDB = wrapEnclave(asDID, enclave);
            if (typeof callback === "function") {
                callback(undefined, mainEnclaveDB);
            }
            return mainEnclaveDB;
        } else {
            enclave.on("initialised", () => {
                mainEnclaveDB = wrapEnclave(asDID, enclave);
                callback(undefined, mainEnclaveDB);
            })
        }
    }

    target.getSharedEnclaveDB = (asDID, callback) => {
        if (typeof asDID === "function") {
            callback = asDID;
            asDID = mainDID;
        }

        let sharedEnclaveDB;
        const __getWrappedEnclave = () => {
            if (!sharedEnclave) {
                return callback(Error(`No shared db found`))
            }
            if (isPromise(sharedEnclave)) {
                sharedEnclave.then((sharedEnclave) => {
                    sharedEnclaveDB = wrapEnclave(asDID, sharedEnclave);
                    callback(undefined, sharedEnclaveDB);
                })
                return;
            }
            sharedEnclaveDB = wrapEnclave(asDID, sharedEnclave);
            callback(undefined, sharedEnclaveDB);
        }
        if (target.isInitialised()) {
            __getWrappedEnclave();
        } else {
            enclave.on("initialised", () => {
                __getWrappedEnclave();
            })
        }
    }

    target.sharedEnclaveExists = () => {
        if (typeof sharedEnclave === "undefined") {
            return false;
        }

        return true;
    }

    target.setPIN = (pin) => {
        PIN = pin;
        if (PIN == undefined) return;
        paddedPIN = pad(pin, 32);
        target.dispatchEvent("pinSet");
    }

    target.getPIN = () => {
        return PIN;
    }

    target.getPaddedPIN = () => {
        return paddedPIN;
    }

    target.isPINNeeded = async () => {

        return new Promise((res, rej) => {
            if (initialised) {
                res(pinNeeded);
            }
            else {
                target.on("initialised", async () => {
                    res(pinNeeded)
                })
            }
        })

    }

    const pad = (key, length) => {
        if (key == undefined) return;
        const padding = "0".repeat(length - key.length);
        return key + padding;
    }

    function isPromise(p) {
        if (typeof p === 'object' && typeof p.then === 'function') {
            return true;
        }
        return false;
    }

    paddedPIN = pad(PIN, 32);

    const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    bindAutoPendingFunctions(target, ["on", "off", "isInitialised", "init", "sharedEnclaveExists", "dispatchEvent", "isPINNeeded"]);
    target.init();
    return target;
}

module.exports = SecurityContext;
