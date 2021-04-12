/*
    Security Context related functionalities

 */
const PendingCallMixin = require("../utils/PendingCallMixin");

const getMainDSU = () => {

    if (!globalVariableExists("rawDossier")) {
        throw Error("Main DSU does not exist in the current context.");
    }
    return getGlobalVariable("rawDossier");
};

const setMainDSU = (mainDSU) => {
    return setGlobalVariable("rawDossier", mainDSU);
};

function SecurityContext(storage) {
    const keySSISpace = require("../keyssi");
    const crypto = require("../crypto")
    PendingCallMixin(this);

    let isInitialized = false;
    const SECURITY_CONTEXT_PERSISTENCE_PATH = "/security_context.json";

    const load = () => {
        storage.getItem(SECURITY_CONTEXT_PERSISTENCE_PATH, (err, scData) => {
            if (err) {
                return console.log(err);
            }

            if ($$.Buffer.isBuffer(scData)) {
                scData = scData.toString();
            }
            try {
                keySSIs = JSON.parse(scData)
            } catch (e) {
                throw Error(`Failed to load security context data`);
            }

            isInitialized = true;
            this.executePendingCalls();
        });
    }

    let keySSIs;
    if (typeof storage === "undefined") {
        keySSIs = {};
        isInitialized = true;
    } else {
        load();
    }


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
                if (storage) {
                    storage.setItem(SECURITY_CONTEXT_PERSISTENCE_PATH, (JSON.stringify(keySSIs)), callback);
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
}

let sc;
const createSecurityContext = (storage) => {
    if (sc) {
        return sc;
    }

    sc = new SecurityContext(storage);
    return sc;
};
module.exports = {
    getMainDSU,
    setMainDSU,
    createSecurityContext
};