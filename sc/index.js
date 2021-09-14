/*
    Security Context related functionalities

 */

const constants = require("../moduleConstants");
const openDSU = require("opendsu");
const http = openDSU.loadAPI("http")
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
    const crypto = require("opendsu").loadAPI("crypto");
    const uid = crypto.generateRandom(5).toString("hex");
    const BASE_DIR_PATH = path.join(require("os").tmpdir(), uid);
    const MAIN_DSU_PATH = path.join(BASE_DIR_PATH, "wallet");
    const DOMAIN = "vault";
    const fs = require("fs");
    const resolver = require("opendsu").loadAPI("resolver");

    fs.readFile(MAIN_DSU_PATH, (err, mainDSUSSI) => {
        if (err) {
            resolver.createSeedDSU(DOMAIN, (err, seedDSU) => {
                if (err) {
                    return callback(err);
                }

                seedDSU.writeFile("/environment.json", JSON.stringify({domain: "vault"}), (err) => {
                    if (err) {
                        return callback(err);
                    }
                    seedDSU.getKeySSIAsString((err, seedSSI) => {
                        if (err) {
                            return callback(err);
                        }

                        fs.mkdirSync(BASE_DIR_PATH, {recursive: true});
                        fs.writeFile(MAIN_DSU_PATH, seedSSI, (err) => callback(err, seedDSU));
                    });
                })
            })

            return;
        }

        resolver.loadDSU(mainDSUSSI.toString(), callback);
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
    const crypto = openDSU.loadAPI("crypto");
    const keySSISpace = openDSU.loadAPI("keyssi")
    const resolver = openDSU.loadAPI("resolver")
    const config = openDSU.loadAPI("config");
    const enclaveAPI = openDSU.loadAPI("enclave");
    let enclave;
    let storageDSU;
    let scDSUKeySSI;

    let initialised = false;

    const getEnclaveInstance = (enclaveType) => {
        switch (enclaveType) {
            case constants.ENCLAVE_TYPES.WALLET_DB_ENCLAVE:
                return enclaveAPI.initialiseWalletDBEnclave();
            case constants.ENCLAVE_TYPES.APIHUB_ENCLAVE:
                return enclaveAPI.initialiseAPIHUBProxy();
            case constants.ENCLAVE_TYPES.HIGH_SECURITY_ENCLAVE:
                return enclaveAPI.initialiseHighSecurityProxy();
            case constants.ENCLAVE_TYPES.MEMORY_ENCLAVE:
                return enclaveAPI.initialiseMemoryEnclave();
            default:
                throw Error(`Invalid enclave type ${enclaveType}`)
        }
    };

    const init = async () => {
        let enclaveType;
        let enclaveDID;
        try {
            enclaveType = await $$.promisify(config.getEnv)(constants.ENCLAVE_TYPE);
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to get env enclaveType`, e);
        }

        if (typeof enclaveType === "undefined") {
            enclaveType = constants.ENCLAVE_TYPES.MEMORY_ENCLAVE;
            try {
                await $$.promisify(config.setEnv)(constants.ENCLAVE_TYPE, enclaveType)
            } catch (e) {
                throw createOpenDSUErrorWrapper(`Failed to set env enclaveType`, e);
            }
        }

        try {
            enclaveDID = await $$.promisify(config.getEnv)(constants.ENCLAVE_DID);
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to get env enclaveDID`, e);
        }

        try {
            scDSUKeySSI = await $$.promisify(config.getEnv)(constants.SECURITY_CONTEXT_KEY_SSI);
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to get env scKeySSI`, e);
        }


        if (typeof scDSUKeySSI === "undefined") {
            try {
                const vaultDomain = await $$.promisify(getVaultDomain)();
                const seedDSU = await $$.promisify(resolver.createSeedDSU)(vaultDomain);
                scDSUKeySSI = await $$.promisify(seedDSU.getKeySSIAsString)();
                storageDSU = seedDSU;
                await $$.promisify(config.setEnv)(constants.SECURITY_CONTEXT_KEY_SSI, scDSUKeySSI)
            } catch (e) {
                throw createOpenDSUErrorWrapper(`Failed to create SeedDSU for sc`, e);
            }
        } else {
            try {
                storageDSU = await $$.promisify(resolver.loadDSU)(scDSUKeySSI);
            } catch (e) {
                throw createOpenDSUErrorWrapper(`Failed to load sc DSU`, e);
            }
        }

        enclave = getEnclaveInstance(enclaveType);
        enclave.on("initialised", async () => {
            if (typeof enclaveDID === "undefined") {
                enclaveDID = enclave.getDID();
                try {
                    await $$.promisify(config.setEnv)(constants.ENCLAVE_DID, enclaveDID)
                } catch (e) {
                    throw createOpenDSUErrorWrapper(`Failed to set env enclaveDID`, e);
                }
            }
            initialised = true;
            this.finishInitialisation();
            this.dispatchEvent("initialised")
        });
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
        enclave.storeSeedSSI(forDID, keySSI, alias, err => {
            if (err) {
                return callback(err);
            }

            callback(undefined, alias);
        })
    };

    this.signForKeySSI = (forDID, keySSI, data, callback) => {
        // temporary solution until proper implementation
        // return callback(undefined, {signature: "", publicKey: ""});
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

    const bindAutoPendingFunctions = require("../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    bindAutoPendingFunctions(this, ["on", "off", "enclaveInitialised"]);
    init();
    return this;
}

const getVaultDomain = (callback) => {
    getMainDSU((err, mainDSU) => {
        if (err) {
            return callback(err);
        }

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
    })
}

const getSecurityContext = () => {
    if (typeof $$.sc === "undefined") {
        $$.sc = new SecurityContext();
    }

    return $$.sc;
};

module.exports = {
    getMainDSU,
    setMainDSU,
    getVaultDomain,
    getSecurityContext
};
