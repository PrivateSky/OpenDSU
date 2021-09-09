const methodsNames = require("../didMethodsNames");

function NameDID_Document(domain, name) {
    if (typeof domain === "undefined" || typeof name === "undefined") {
        throw Error(`Invalid number of arguments. Expected blockchain domain and group name.`);
    }

    let mixin = require("./ConstDID_Document_Mixin");
    mixin(this, domain, name);
    const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;

    this.getMethodName = () => {
        return methodsNames.NAME_SUBTYPE;
    }

    this.getIdentifier = () => {
        return `did:ssi:name:${domain}:${name}`;
    };

    this.getName = () => {
        return name;
    };

    bindAutoPendingFunctions(this, ["init", "getIdentifier", "getName", "on", "off", "addPublicKey", "readMessage", "getDomain", "getHash"]);
    this.init();
    return this;
}


module.exports = {
    initiateDIDDocument: function (domain, name) {
        return new NameDID_Document(domain, name)
    },
    createDIDDocument: function (tokens) {
        return new NameDID_Document(tokens[3], tokens[4]);
    }
};
