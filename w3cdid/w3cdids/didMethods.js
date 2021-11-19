function KeyDID_Method() {
    let KeyDIDDocument = require("./KeyDID_Document");
    this.create = function (enclave, seedSSI, callback) {
        if (typeof seedSSI === "function") {
            callback = seedSSI;
            seedSSI = undefined;
        }
        const keyDIDDocument = KeyDIDDocument.initiateDIDDocument(enclave, seedSSI);
        keyDIDDocument.on("initialised", () => {
            callback(undefined, keyDIDDocument);
        });
    }

    this.resolve = function (tokens, callback) {
        callback(null, KeyDIDDocument.createDIDDocument(tokens))
    }
}

module.exports = {
    create_KeyDID_Method() {
        return new KeyDID_Method();
    }
}