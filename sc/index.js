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
    const MAIN_DSU_PATH = path.join(require("os").tmpdir(), "wallet");
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
    const db = openDSU.loadAPI("db")
    const keySSISpace = openDSU.loadAPI("keyssi")

    const DB_NAME = "security_context";
    const KEY_SSIS_TABLE = "keyssis";
    const DIDS_PRIVATE_KEYS = "dids_private";
    const DIDS_PUBLIC_KEYS = "dids_public";

    let storageDB;
    let initialised = false;

    function apiIsAvailable(callback) {
        if (!initialised) {
            callback(Error(`API unavailable because enclave is unable to be initialised.`))
            return false;
        }

        return true;
    }

    const init = async () => {
        enclave.on("initialised", () => {
            initialised = true;
            this.dispatchEvent("initialised")
        })
    }

    this.registerDID = (didDocument, callback) => {
        if (!apiIsAvailable(callback)) {
            return;
        }
        let privateKeys = didDocument.getPrivateKeys();
        if (!Array.isArray(privateKeys)) {
            privateKeys = [privateKeys]
        }
        enclave.storeDID(didDocument, didDocument, privateKeys, callback);
    };

    this.addPrivateKeyForDID = (didDocument, privateKey, callback) => {
        if (!apiIsAvailable(callback)) {
            return;
        }
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
        if (!apiIsAvailable(callback)) {
            return;
        }
        const publicKeyObj = {publicKeys: [publicKey]}
        storageDB.getRecord(DIDS_PUBLIC_KEYS, didDocument.getIdentifier(), (err, res) => {
            if (err || !res) {
                return storageDB.insertRecord(DIDS_PUBLIC_KEYS, didDocument.getIdentifier(), publicKeyObj, callback);
            }

            res.publicKeys.push(publicKey);
            return storageDB.updateRecord(DIDS_PUBLIC_KEYS, didDocument.getIdentifier(), res, callback);
        });
    }

    this.registerKeySSI = (keySSI, callback) => {
        if (!apiIsAvailable(callback)) {
            return;
        }
        const generateUid =
        enclave.storeSeedSSI(undefined, keySSI, )
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
        if (!apiIsAvailable(callback)) {
            return;
        }
        enclave.sign(didDocument, didDocument, data, callback);
    }

    this.verifyForDID = (didDocument, data, signature, callback) => {
        if (!apiIsAvailable(callback)) {
            return;
        }
        didDocument.verifyImpl(data, signature, callback);
    }


    this.encryptForDID = (senderDIDDocument, receiverDIDDocument, message, callback) => {
        if (!apiIsAvailable(callback)) {
            return;
        }
        enclave.encryptMessage(senderDIDDocument, senderDIDDocument, receiverDIDDocument, message, callback);
    };

    this.decryptAsDID = (didDocument, encryptedMessage, callback) => { // throw e;
        // keySSI = keySSISpace.createSeedSSI("default");
        if (!apiIsAvailable(callback)) {
            return;
        }
        enclave.decryptMessage(didDocument, didDocument, encryptedMessage, callback)
    };

    this.getDb = (callback) => {
        if (!apiIsAvailable(callback)) {
            return;
        }
        storageDB.on("initialised", () => {
            callback(undefined, storageDB);
        })
    }

    this.storageDbIsInitialised = () => {
        return typeof storageDB !== "undefined";
    }

    const bindAutoPendingFunctions = require("../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    bindAutoPendingFunctions(this, ["on", "off"]);
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

const loadSecurityContext = (callback) => {
    getMainDSU((err, mainDSU) => {
        if (err) {
            return callback(err);
        }

        mainDSU.readFile(constants.SECURITY_CONTEXT, (err, securityContextKeySSI) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to read security context keySSI`, err));
            }

            callback(undefined, securityContextKeySSI.toString());
        })
    })
}

const saveSecurityContext = (scKeySSI, callback) => {
    if (typeof scKeySSI === "object") {
        scKeySSI = scKeySSI.getIdentifier();
    }
    getMainDSU((err, mainDSU) => {
        if (err) {
            return callback(err);
        }

        mainDSU.writeFile(constants.SECURITY_CONTEXT, scKeySSI, (err) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to save security context keySSI`, err));
            }

            callback(undefined);
        })
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
    getVaultDomain,
    getSecurityContext
};
