/*
    Security Context related functionalities

 */

const constants = require("../moduleConstants");
const openDSU = require("opendsu");
const http = openDSU.loadAPI("http")
const config = openDSU.loadAPI("config")
const keySSISpace = openDSU.loadAPI("keyssi");
const resolver = openDSU.loadAPI("resolver");
const {getURLForSsappContext} = require("../utils/getURLForSsappContext");

function getMainDSU(callback) {
    callback = $$.makeSaneCallback(callback);
    if (globalVariableExists("rawDossier")) {
        return callback(undefined, getGlobalVariable("rawDossier"));
    }
    switch ($$.environmentType) {
        case constants.ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:
        case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:

        function __getMainDSUFromSw() {
            if (!globalVariableExists("rawDossier")) {
                setTimeout(() => {
                    __getMainDSUFromSw()
                }, 100);
                return;
            }
            return callback(undefined, getGlobalVariable("rawDossier"));
        }

            return __getMainDSUFromSw();
        case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
            return getMainDSUForIframe(callback);
        case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
            return getMainDSUForNode(callback);
        default:
            return callback(Error("Main DSU does not exist in the current context."));
    }
}

function getMainDSUForNode(callback) {
    const path = require("path");
    const resolver = require("opendsu").loadAPI("resolver");
    const DOMAIN = process.env.VAULT_DOMAIN || "vault";
    const fs = require("fs");

    if (!process.env.PSK_CONFIG_LOCATION) {
        return createMainDSU(callback);
    }

    const MAIN_DSU_PATH = path.join(process.env.PSK_CONFIG_LOCATION, "../mainDSU");

    function createMainDSU(callback) {
        resolver.createSeedDSU(DOMAIN, (err, seedDSU) => {
            if (err) {
                return callback(err);
            }
            setMainDSU(seedDSU);

            seedDSU.writeFile("/environment.json", JSON.stringify({
                vaultDomain: DOMAIN,
                didDomain: DOMAIN
            }), err => callback(err, seedDSU));
        });
    }

    fs.readFile(MAIN_DSU_PATH, (err, mainDSUSSI) => {
        if (err) {
            createMainDSU((err, seedDSU) => {
                if (err) {
                    return callback(err);
                }

                seedDSU.getKeySSIAsString((err, seedSSI) => {
                    if (err) {
                        return callback(err);
                    }
                    fs.writeFile(MAIN_DSU_PATH, seedSSI, (err) => callback(err, seedDSU));
                });
            })

            return;
        }

        resolver.loadDSU(mainDSUSSI.toString(), (err, dsu) => {
            if (err) {
                return callback(err);
            }

            setMainDSU(dsu);
            callback(undefined, dsu);
        });
    })
}

function getMainDSUForIframe(callback) {
    let mainDSU = getGlobalVariable("rawDossier");
    if (mainDSU) {
        return callback(undefined, mainDSU);
    }

    http.doGet(getURLForSsappContext("/getSSIForMainDSU"), (err, res) => {
        if (err || res.length === 0) {
            return callback(createOpenDSUErrorWrapper("Failed to get main DSU SSI", err));
        }

        let config = openDSU.loadApi("config");

        let mainSSI = keySSISpace.parse(res);
        if (mainSSI.getHint() === "server") {
            config.disableLocalVault();
        }
        resolver.loadDSU(mainSSI, (err, mainDSU) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper("Failed to load main DSU ", err));
            }

            setMainDSU(mainDSU);
            callback(undefined, mainDSU);
        });
    });
}

const setMainDSU = (mainDSU) => {
    return setGlobalVariable("rawDossier", mainDSU);
};

function SecurityContext() {
    const ObservableMixin = require("../utils/ObservableMixin");
    ObservableMixin(this);
    const openDSU = require("opendsu");
    const config = openDSU.loadAPI("config");
    const enclaveAPI = openDSU.loadAPI("enclave");
    let enclave;
    let sharedEnclave;
    let storageDSU;
    let scDSUKeySSI;
    let mainDID;

    let initialised = false;

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

        sharedEnclave = enclaveAPI.createEnclave(sharedEnclaveType, sharedEnclaveKeySSI);
        return sharedEnclave;
    }

    const init = async () => {
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

            if (!sharedEnclave) {
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
        this.finishInitialisation();
        this.dispatchEvent("initialised")
    }

    this.registerDID = (didDocument, callback) => {
        let privateKeys = didDocument.getPrivateKeys();
        if (!Array.isArray(privateKeys)) {
            privateKeys = [privateKeys]
        }
        enclave.storeDID(didDocument, didDocument, privateKeys, callback);
    };

    this.addPrivateKeyForDID = (didDocument, privateKey, callback) => {
        enclave.addPrivateKeyForDID(didDocument, privateKey, callback);
    }

    this.registerKeySSI = (forDID, keySSI, callback) => {
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

    this.signForKeySSI = (forDID, keySSI, data, callback) => {
        enclave.signForKeySSI(forDID, keySSI, data, callback);
    }

    this.signAsDID = (didDocument, data, callback) => {
        enclave.signForDID(didDocument, didDocument, data, callback);
    }

    this.verifyForDID = (didDocument, data, signature, callback) => {
        enclave.verifyForDID(didDocument, didDocument, data, signature, callback);
    }


    this.encryptForDID = (senderDIDDocument, receiverDIDDocument, message, callback) => {
        enclave.encryptMessage(senderDIDDocument, senderDIDDocument, receiverDIDDocument, message, callback);
    };

    this.decryptAsDID = (didDocument, encryptedMessage, callback) => {
        enclave.decryptMessage(didDocument, didDocument, encryptedMessage, callback)
    }

    this.isInitialised = () => {
        return initialised;
    }

    this.getDB = (callback) => {
        const dbApi = openDSU.loadAPI("db");
        const db = dbApi.getWalletDB(scDSUKeySSI, "defaultDB")
        db.on("initialised", () => {
            callback(undefined, db);
        })
    }

    this.getDSU = (callback) => {
        callback(undefined, storageDSU);
    }

    const wrapEnclave = (asDID, enclave) => {
        const wrappedEnclave = {};
        let asyncDBMethods = ["insertRecord", "updateRecord", "getRecord", "deleteRecord", "filter", "commitBatch", "cancelBatch", "getKeySSI", "readKey", "writeKey", "getAllRecords"];
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
    this.getMainEnclaveDB = (asDID, callback) => {
        if (typeof asDID === "function") {
            callback = asDID;
            asDID = mainDID;
        }

        let mainEnclaveDB;
        if (this.isInitialised()) {
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

    this.getSharedEnclaveDB = (asDID, callback) => {
        if (typeof asDID === "function") {
            callback = asDID;
            asDID = mainDID;
        }

        let sharedEnclaveDB;
        const __getWrappedEnclave = () => {
            if (!sharedEnclave) {
                return callback(Error(`No shared db found`))
            }
            sharedEnclaveDB = wrapEnclave(asDID, sharedEnclave);
            callback(undefined, sharedEnclaveDB);
        }
        if (this.isInitialised()) {
            __getWrappedEnclave();
        } else {
            enclave.on("initialised", () => {
                __getWrappedEnclave();
            })
        }
    }

    const bindAutoPendingFunctions = require("../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    bindAutoPendingFunctions(this, ["on", "off", "isInitialised"]);
    init();
    return this;
}

const getVaultDomain = (callback) => {
    config.getEnv(constants.VAULT_DOMAIN, (err, vaultDomain) => {
        if (err || !vaultDomain) {
            console.log(`The property <${constants.DOMAIN}> is deprecated in environment.js. Use the property <${constants.VAULT_DOMAIN}> instead`)
            return config.getEnv(constants.DOMAIN, callback);
        }

        callback(undefined, vaultDomain);
    });
}

const getDIDDomain = (callback) => {
    config.getEnv(constants.DID_DOMAIN, callback);
}

const securityContextIsInitialised = () => {
    if (typeof $$.sc === "undefined") {
        return false;
    }

    return $$.sc.isInitialised();
}

const getSecurityContext = () => {
    if (typeof $$.sc === "undefined") {
        $$.sc = new SecurityContext();
    }

    return $$.sc;
};

const refreshSecurityContext = () => {
    $$.sc = new SecurityContext();
    return $$.sc;
};

const getMainEnclave = (callback) => {
    if (!$$.sc && !callback) {
        return;
    }
    const sc = getSecurityContext();
    if (sc.isInitialised()) {
        return sc.getMainEnclaveDB(callback);
    } else {
        sc.on("initialised", () => {
            sc.getMainEnclaveDB(callback);
        });
    }
}

const getSharedEnclave = (callback) => {
    const sc = getSecurityContext();
    if (sc.isInitialised()) {
        sc.getSharedEnclaveDB(callback);
    } else {
        sc.on("initialised", () => {
            sc.getSharedEnclaveDB(callback);
        });
    }
}

const configEnvironment = (config, callback) => {
    getMainDSU((err, mainDSU) => {
        if (err) {
            return callback(createOpenDSUErrorWrapper("Failed to get main DSU", err));
        }

        mainDSU.readFile(constants.ENVIRONMENT_PATH, (err, env) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper("Failed to read env", err));
            }

            try {
                env = JSON.parse(env.toString());
            } catch (e) {
                return callback(createOpenDSUErrorWrapper("Failed to parse env", e));
            }

            Object.assign(env, config);
            config = env;
            mainDSU.writeFile(constants.ENVIRONMENT_PATH, JSON.stringify(config), (err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper("Failed to write env", err));
                }

                const sc = refreshSecurityContext();
                sc.on("initialised", () => callback(undefined, sc));
            });
        })
    })
}

module.exports = {
    getMainDSU,
    setMainDSU,
    getVaultDomain,
    getSecurityContext,
    refreshSecurityContext,
    getDIDDomain,
    securityContextIsInitialised,
    getMainEnclave,
    getSharedEnclave,
    configEnvironment
};
