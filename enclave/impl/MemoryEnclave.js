function MemoryEnclave() {
    const EnclaveMixin = require("./Enclave_Mixin");
    EnclaveMixin(this);
    const openDSU = require("opendsu");
    const db = openDSU.loadAPI("db");
    let initialised = false;
    const init = () => {
        this.storageDB = db.getInMemoryDB();
        setTimeout(async () => {
            initialised = true;
            this.dispatchEvent("initialised");
        })
    }

    this.isInitialised = () => {
        return initialised
    }

    init();
}

module.exports = MemoryEnclave;