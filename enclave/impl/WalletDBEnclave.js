function WalletDBEnclave(keySSI, did) {
    const openDSU = require("opendsu");
    const db = openDSU.loadAPI("db")
    const scAPI = openDSU.loadAPI("sc");
    const resolver = openDSU.loadAPI("resolver");
    const config = openDSU.loadAPI("config");
    const DB_NAME = "walletdb_enclave";
    const EnclaveMixin = require("./Enclave_Mixin");
    EnclaveMixin(this, did);
    let enclaveDSU;
    let initialised = false;
    const init = async () => {
        if (!keySSI) {
            try {
                keySSI = await $$.promisify(config.getEnv)(openDSU.constants.MAIN_ENCLAVE.KEY_SSI);
            } catch (e) {
            }

            if (!keySSI) {
                let vaultDomain;
                try {
                    vaultDomain = await $$.promisify(scAPI.getVaultDomain)();
                } catch (e) {
                    throw createOpenDSUErrorWrapper(`Failed to get vault domain`, e);
                }

                try {
                    enclaveDSU = await $$.promisify(resolver.createSeedDSU)(vaultDomain);
                } catch (e) {
                    throw createOpenDSUErrorWrapper(`Failed to create Seed DSU`, e);
                }

                try {
                    keySSI = await $$.promisify(enclaveDSU.getKeySSIAsString)();
                } catch (e) {
                    throw createOpenDSUErrorWrapper(`Failed to get enclave DSU KeySSI`, e);
                }
                try {
                    await $$.promisify(config.setEnv)(openDSU.constants.MAIN_ENCLAVE.KEY_SSI, keySSI);
                } catch (e) {
                    throw createOpenDSUErrorWrapper(`Failed to store enclave DSU KeySSI`, e);
                }
            }
        }

        this.storageDB = db.getWalletDB(keySSI, DB_NAME);
        this.storageDB.on("initialised", () => {
            initialised = true;
            this.finishInitialisation();
            this.dispatchEvent("initialised");
        })
    };

    this.getKeySSI = (forDID, callback) => {
        if (typeof forDID === "function") {
            callback = forDID;
            forDID = undefined;
        }
        callback(undefined, keySSI);
    }

    this.getEnclaveType = () => {
        return openDSU.constants.ENCLAVE_TYPES.WALLET_DB_ENCLAVE;
    };

    this.isInitialised = () => {
        return initialised;
    };

    const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    bindAutoPendingFunctions(this, ["on", "off", "beginBatch", "isInitialised", "getEnclaveType"]);

    init();
}

module.exports = WalletDBEnclave;