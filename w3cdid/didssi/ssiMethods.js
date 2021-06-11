function SReadDID_Method() {
    let SReadDID_Document = require("./SReadDID_Document");
    this.create = function (seedSSI, callback) {
        callback(null, SReadDID_Document.initiateDIDDocument(seedSSI));
    }

    this.resolve = function (tokens, callback) {
        callback(null, SReadDID_Document.createDIDDocument(tokens))
    }
}

function KeyDID_Method() {
    let KeyDIDDocument = require("./KeyDID_Document");
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

function NameDID_Method() {
    const NameDIDDocument = require("./NameDID_Document");

    this.create = (domain, publicName, callback) => {
        const nameDIDDocument = NameDIDDocument.initiateDIDDocument(domain, publicName);
        nameDIDDocument.on("initialised", () => {
            const securityContext = require("opendsu").loadAPI("sc").getSecurityContext();

            securityContext.registerDID(nameDIDDocument, (err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`failed to register did ${nameDIDDocument.getIdentifier()} in security context`, err));
                }

                callback(null, nameDIDDocument);
            })
        });
    }

    this.resolve = (tokens, callback) => {
        callback(null, NameDIDDocument.createDIDDocument(tokens))
    }
}

function GroupDID_Method() {
    const GroupDIDDocument = require("./GroupDID_Document");

    this.create = (domain, groupName, callback) => {
        callback(null, GroupDIDDocument.initiateDIDDocument(domain, groupName));
    }

    this.resolve = (tokens, callback) => {
        callback(null, GroupDIDDocument.createDIDDocument(tokens))
    }
}

function create_KeyDID_Method() {
    return new KeyDID_Method();
}

function create_SReadDID_Method() {
    return new SReadDID_Method();
}

function create_NameDID_Method() {
    return new NameDID_Method();
}

function create_GroupDID_Method() {
    return new GroupDID_Method();
}


module.exports = {
    create_KeyDID_Method,
    create_SReadDID_Method,
    create_NameDID_Method,
    create_GroupDID_Method
}
