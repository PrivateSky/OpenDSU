function WalletDBEnclave() {
    const openDSU = require("opendsu");
    const db = openDSU.loadAPI("db")
    const keySSISpace = openDSU.loadAPI("keyssi")
    const scAPI = openDSU.loadAPI("sc");

    const DB_NAME = "walletdb_enclave";
    const KEY_SSIS_TABLE = "keyssis";
    const SEED_SSIS_TABLE = "seedssis";
    const DIDS_PRIVATE_KEYS = "dids_private";
    const DIDS_PUBLIC_KEYS = "dids_public";

    const EnclaveMixin = require("./Enclave_Mixin");


    EnclaveMixin(this);

    let enclaveDID;
    const init = () => {
        scAPI.getMainDSU(async (err, mainDSU) => {
            if (err) {
                throw createOpenDSUErrorWrapper(`Failed to get mainDSU`, err);
            }
            let keySSI;
            try {
                keySSI = await $$.promisify(mainDSU.getKeySSIAsObject)();
            } catch (e) {
                throw createOpenDSUErrorWrapper(`Failed to get mainDSU's keySSI`, e);
            }
            this.storageDB = db.getWalletDB(keySSI, DB_NAME);
            this.storageDB.on("initialised", () => {
                this.finishInitialisation();
                this.dispatchEvent("initialised");
            })
        })

    };

    const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    bindAutoPendingFunctions(this, ["on", "off"]);

    init();
}

module.exports = WalletDBEnclave;