function MemoryEnclave() {
    const EnclaveMixin = require("./Enclave_Mixin");
    EnclaveMixin(this);
    const db = require("opendsu").loadAPI("db");
    const init = () => {
        this.storageDB = db.getInMemoryDB();
        setTimeout(() => {
            this.dispatchEvent("initialised");
        })
    }

    init();
}

module.exports = MemoryEnclave;