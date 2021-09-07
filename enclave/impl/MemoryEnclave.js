function MemoryEnclave() {
    const EnclaveMixin = require("./Enclave_Mixin");
    EnclaveMixin(this);
    const openDSU = require("opendsu");
    const db = openDSU.loadAPI("db");
    const init = () => {
        this.storageDB = db.getInMemoryDB();
        setTimeout(async () => {
            this.dispatchEvent("initialised");
        })
    }

    init();
}

module.exports = MemoryEnclave;