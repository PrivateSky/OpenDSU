/*
    Security Context related functionalities

 */

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
    const DB_NAME = "security_context";
    const KEY_SSIS_TABLE = "keyssis";
    const DIDS_TABLE = "dids";

    let isInitialized = false;
    const SECURITY_CONTEXT_PERSISTENCE_PATH = "/security_context.json";
    const crypto = require("opendsu").loadAPI("crypto");
    const db = require("opendsu").loadAPI("db")
    const bindAutoPendingFunctions = require("../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;

    let storageDB;
    setTimeout(() => {
        storageDB = db.getWalletDB(keySSI, DB_NAME);
        storageDB.on("initialised", () => {
            this.finishInitialisation();
        });
    }, 0);



    this.addDID = (did, keySSI, callback) => {
        if (typeof keySSI === "object") {
            keySSI = keySSI.getIdentifier();
        }

        storageDB.insertRecord(DIDS_TABLE, did, {keySSI}, callback);
    };

    this.getKeySSIForDID = (did, callback) => {
        storageDB.getRecord(DIDS_TABLE, did, (err, record) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, record.keySSI);
        });
    };

    const keySSIs = {};
    this.registerKeySSI = (keySSI, callback) => {
        if (typeof keySSI === "undefined") {
            return callback(Error(`A SeedSSI should be specified.`));
        }

        if (typeof keySSI === "string") {
            keySSI = keySSISpace.parse(keySSI);
        }

        let derivedKeySSI = keySSI;
        const keySSIIdentifier = keySSI.getIdentifier();

        function registerDerivedKeySSIs(derivedKeySSI) {
            try {
                derivedKeySSI = derivedKeySSI.derive();
                keySSIs[derivedKeySSI.getIdentifier()] = keySSIIdentifier;
            } catch (e) {
                if (storageDB) {
                    storageDB.setItem(SECURITY_CONTEXT_PERSISTENCE_PATH, (JSON.stringify(keySSIs)), callback);
                }
                return;
            }
            registerDerivedKeySSIs(derivedKeySSI);
        }

        return registerDerivedKeySSIs(derivedKeySSI);
    };

    this.getKeySSI = (keySSI) => {
        if (!isInitialized) {
            return this.addPendingCall(() => {
                this.getKeySSI(keySSI);
            });
        }

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

    this.verify = (keySSI, data, signature, callback) => {

    }

    this.encrypt = (keySSI, data, callback) => {

    };

    this.decrypt = (keySSI, data, callback) => {

    };

    bindAutoPendingFunctions(this);
    return this;
}

const getSecurityContext = (keySSI) => {
    if (typeof $$.sc === "undefined") {
        if (typeof keySSI === "undefined") {
            const keySSISpace = require("opendsu").loadAPI("keyssi");
            keySSI = keySSISpace.createSeedSSI("default");
        }
        $$.sc = new SecurityContext(keySSI);
    }

    return $$.sc;
};
module.exports = {
    getMainDSU,
    setMainDSU,
    getSecurityContext
};
