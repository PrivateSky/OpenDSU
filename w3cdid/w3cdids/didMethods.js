function KeyDID_Method() {
    let KeyDIDDocument = require("./KeyDID_Document");
    this.create = function (callback) {
        const keyDIDDocument = KeyDIDDocument.initiateDIDDocument();
        const securityContext = require("opendsu").loadAPI("sc").getSecurityContext();
        securityContext.registerDID(keyDIDDocument, (err) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`failed to register did ${keyDIDDocument.getIdentifier()} in security context`, err));
            }

            callback(null, keyDIDDocument);
        })
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