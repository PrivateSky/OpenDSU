function KeyDID_Method() {
    let KeyDIDDocument = require("./KeyDID_Document");
    this.create = function (enclave, publicKey, privateKey, callback) {
        if (typeof privateKey === "function") {
            callback = privateKey;
            privateKey = undefined;
        }

        if (typeof publicKey === "function") {
            callback = publicKey;
            publicKey = undefined;
        }

        const keyDIDDocument = KeyDIDDocument.initiateDIDDocument(enclave,  publicKey, privateKey);
        keyDIDDocument.on("initialised", () => {
            callback(undefined, keyDIDDocument);
        });
    }

    this.resolve = function (enclave, tokens, callback) {
        callback(null, KeyDIDDocument.createDIDDocument(enclave, tokens));
    }
}

module.exports = {
    create_KeyDID_Method() {
        return new KeyDID_Method();
    }
}