function WalletDBEnclave(did) {
    const openDSU = require("opendsu");
    const db = openDSU.loadAPI("db")
    const scAPI = openDSU.loadAPI("sc");
    const resolver = openDSU.loadAPI("resolver");
    const w3cDID = openDSU.loadAPI("w3cdid");
    const DB_NAME = "walletdb_enclave";
    const ENCLAVE_DSU_KEY_SSI_PATH = ".enclave";
    const EnclaveMixin = require("./Enclave_Mixin");
    EnclaveMixin(this, did);
    //.enclave in mainDSU
    let enclaveDSU;
    let enclaveDSUKeySSI;

    const init = async () => {
        let mainDSU;
        try {
            mainDSU = await $$.promisify(scAPI.getMainDSU)();
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to get main DSU`, e);
        }

        try {
            enclaveDSUKeySSI = await $$.promisify(mainDSU.readFile)(ENCLAVE_DSU_KEY_SSI_PATH);
            enclaveDSUKeySSI = enclaveDSUKeySSI.toString();
        } catch (e) {
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
                enclaveDSUKeySSI = await $$.promisify(enclaveDSU.getKeySSIAsString)();
            } catch (e) {
                throw createOpenDSUErrorWrapper(`Failed to get enclave DSU KeySSI`, e);
            }
            try {
                await $$.promisify(mainDSU.writeFile)(ENCLAVE_DSU_KEY_SSI_PATH, enclaveDSUKeySSI);
            } catch (e) {
                throw createOpenDSUErrorWrapper(`Failed to store enclave DSU KeySSI`, e);
            }
        }

        this.storageDB = db.getWalletDB(enclaveDSUKeySSI, DB_NAME);
        this.storageDB.on("initialised", () => {
            this.finishInitialisation();
            this.dispatchEvent("initialised");
        })
    };

    const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    bindAutoPendingFunctions(this, ["on", "off", "getDID"]);

    init();
}

module.exports = WalletDBEnclave;