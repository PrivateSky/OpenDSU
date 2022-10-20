function WalletDBEnclave(keySSI, did) {
    const openDSU = require("opendsu");
    const constants = require("./constants");
    const db = openDSU.loadAPI("db")
    const scAPI = openDSU.loadAPI("sc");
    const resolver = openDSU.loadAPI("resolver");
    const config = openDSU.loadAPI("config");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const DB_NAME = constants.DB_NAMES.WALLET_DB_ENCLAVE;
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

        await $$.promisify(resolver.invalidateDSUCache)(keySSI);
        this.storageDB = db.getSimpleWalletDB(DB_NAME, {keySSI});
        this.storageDB.on("initialised", async () => {
            if (typeof keySSI === "string") {
                keySSI = keySSISpace.parse(keySSI);
            }
            let privateKey;
            try{
                privateKey = await $$.promisify(this.storageDB.getRecord)(constants.TABLE_NAMES.PATH_KEY_SSI_PRIVATE_KEYS, 0);
            } catch (e) {
            }
            if (!privateKey) {
                await $$.promisify(this.storageDB.insertRecord)(constants.TABLE_NAMES.PATH_KEY_SSI_PRIVATE_KEYS, 0, {privateKey: keySSI.getPrivateKey()});
            }

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