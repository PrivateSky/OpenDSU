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
    const openDSU = require("opendsu");
    const crypto = openDSU.loadAPI("crypto");
    const db = openDSU.loadAPI("db")
    const keySSISpace = openDSU.loadAPI("keyssi")

    const DB_NAME = "security_context";
    const KEY_SSIS_TABLE = "keyssis";
    const DIDS_TABLE = "dids";

    let isInitialized = false;

    const bindAutoPendingFunctions = require("../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;

    if (typeof keySSI === "string") {
        keySSI = keySSISpace.parse(keySSI);
    }

    let storageDB = db.getWalletDB(keySSI, DB_NAME);


    this.registerDID = (didDocument, callback) => {
        //TODO insert or update
        storageDB.insertRecord(DIDS_TABLE, didDocument.getIdentifier(), didDocument.getPrivateKeys(), callback);
    };

    this.getPrivateInfoForDID = (did, callback) => {
        storageDB.getRecord(DIDS_TABLE, did, (err, record) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, $$.Buffer.from(record.privateKey));
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
        // storageDB.insertRecord(KEY_SSIS_TABLE, keySSIIdentifier, {capableOfSigningKeySSI: keySSIIdentifier}, (err) => {
        //     if (err) {
        //         return callback(createOpenDSUErrorWrapper(`Failed to add keySSI ${keySSI}`, err));
        //     }
        //
        //     registerDerivedKeySSIs(keySSI, callback);
        // });
        // registerDerivedKeySSIs(keySSI);

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
        didDocument.signImpl(data, callback);
    }
    //Get SSI for DID
    this.verifyForDID = (didDocument, data, signature, callback) => {
        didDocument.verifyImpl(data, signature, callback);
    }


    this.encryptForDID = (did, data, callback) => {

    };

    this.decryptAsDID = (did, data, callback) => {

    };

    // bindAutoPendingFunctions(this, ["on", "off"]);
    // setTimeout(() => {
    //     storageDB = db.getWalletDB(keySSI, DB_NAME);
    //     storageDB.on("initialised", () => {
    //         console.log("Finished initialization #############################################", this);
    //         this.finishInitialisation();
    //     });
    // }, 0);
    return this;
}

const getSecurityContext = (keySSI) => {
    if (typeof $$.sc === "undefined") {
        const keySSISpace = require("opendsu").loadAPI("keyssi");
        if (typeof keySSI === "undefined") {
            //TODO get sc from main dsu
            // throw Error(`A keySSI should be provided.`)
            keySSI = keySSISpace.createSeedSSI("default");
        }

        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                throw createOpenDSUErrorWrapper(`Failed to parse keySSI ${keySSI}`, e);
            }
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
