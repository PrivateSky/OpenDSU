function sRead_DIDMethod() {
    let pkDocument = require("./sReadDID");
    this.create = function (seedSSI, callback) {
        callback(null, pkDocument.initiateDIDDocument(seedSSI));
    }

    this.resolve = function (tokens, callback) {
        callback(null, pkDocument.createDIDDocument(tokens))
    }
}

function Key_DIDMethod() {
    let KeyDIDDocument = require("./KeyDidDocument");
    this.create = function (seedSSI, callback) {
        const keyDIDDocument = KeyDIDDocument.initiateDIDDocument(seedSSI);
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

function Name_DIDMethod() {
    const NameDIDDocument = require("./GroupDIDDocument");

    this.create = (domain, publicName, callback) => {
        callback(null, NameDIDDocument.initiateDIDDocument(domain, publicName));
    }

    this.resolve = (tokens, callback) => {
        callback(null, NameDIDDocument.createDIDDocument(tokens))
    }
}

function Group_DIDMethod() {
    const GroupDIDDocument = require("./GroupDIDDocument");

    this.create = (domain, groupName, callback) => {
        callback(null, GroupDIDDocument.initiateDIDDocument(domain, groupName));
    }

    this.resolve = (tokens, callback) => {
        callback(null, GroupDIDDocument.createDIDDocument(tokens))
    }
}

function create_key_DIDMethod() {
    return new Key_DIDMethod();
}

function create_sRead_DIDMethod() {
    return new sRead_DIDMethod();
}

function create_name_DIDMethod() {
    return new Name_DIDMethod();
}

function create_group_DIDMethod() {
    return new Group_DIDMethod();
}


module.exports = {
    create_key_DIDMethod,
    create_sRead_DIDMethod,
    create_name_DIDMethod,
    create_group_DIDMethod
}
