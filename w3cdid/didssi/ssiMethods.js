const GroupDIDDocument = require("./GroupDID_Document");

function storeDIDInSC(didDocument, callback) {
    const securityContext = require("opendsu").loadAPI("sc").getSecurityContext();
        const __registerDID = ()=>{
            securityContext.registerDID(didDocument, (err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`failed to register did ${didDocument.getIdentifier()} in security context`, err));
                }

                callback(null, didDocument);
            })
        }
        if(securityContext.isInitialised()){
            __registerDID();
        }else {
            securityContext.on("initialised", ()=>{
                __registerDID()
            })
        }
}
function SReadDID_Method() {
    let SReadDID_Document = require("./SReadDID_Document");
    this.create = (seedSSI, callback) => {
        const sReadDIDDocument = SReadDID_Document.initiateDIDDocument(seedSSI);
        sReadDIDDocument.on("initialised", () => {
            storeDIDInSC(sReadDIDDocument, callback);
        });
    }
    this.resolve = function (tokens, callback) {
        const sReadDIDDocument = SReadDID_Document.createDIDDocument(tokens);
        sReadDIDDocument.on("initialised", () => {
            callback(null, sReadDIDDocument);
        });
    }
}

function KeyDID_Method() {
    let KeyDIDDocument = require("./KeyDID_Document");
    this.create = function (seedSSI, callback) {
        const keyDIDDocument = KeyDIDDocument.initiateDIDDocument(seedSSI);
        storeDIDInSC(keyDIDDocument, callback);
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
            storeDIDInSC(nameDIDDocument, callback);
        });
    }

    this.resolve = (tokens, callback) => {
        const nameDIDDocument = NameDIDDocument.createDIDDocument(tokens);
        nameDIDDocument.on("initialised", () => {
            callback(null, nameDIDDocument)
        });
    }
}

function GroupDID_Method() {
    const GroupDIDDocument = require("./GroupDID_Document");

    this.create = (domain, groupName, callback) => {
        const groupDIDDocument = GroupDIDDocument.initiateDIDDocument(domain, groupName);
        groupDIDDocument.on("error", (err) => {
            return callback(err);
        })

        groupDIDDocument.on("initialised", () => {
            storeDIDInSC(groupDIDDocument, callback);
        })
    }

    this.resolve = (tokens, callback) => {
        const groupDIDDocument = GroupDIDDocument.createDIDDocument(tokens);

        groupDIDDocument.on("error", (err) => {
            return callback(err);
        })

        groupDIDDocument.on("initialised", () => {
            return callback(undefined, groupDIDDocument);
        })
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
