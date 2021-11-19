const methodsNames = require("../didMethodsNames");

function NameDID_Document(enclave, domain, name, isInitialisation) {
    if (arguments.length === 3) {
        isInitialisation = name;
        name = domain;
        domain = undefined;
    }
    if (typeof name === "undefined") {
        throw Error(`Argument name is missing`);
    }

    let mixin = require("./ConstDID_Document_Mixin");
    mixin(this, enclave, domain, name, isInitialisation);
    const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;

    this.getMethodName = () => {
        return methodsNames.NAME_SUBTYPE;
    }

    this.getIdentifier = () => {
        return `did:ssi:name:${this.getDomain()}:${name}`;
    };

    this.getName = () => {
        return name;
    };

    bindAutoPendingFunctions(this, ["init", "getIdentifier", "getName", "on", "off", "dispatchEvent", "removeAllObservers", "addPublicKey", "readMessage", "getDomain", "getHash"]);
    this.init();
    return this;
}


module.exports = {
    initiateDIDDocument: function (enclave, domain, name) {
        return new NameDID_Document(enclave, domain, name, true);
    },
    createDIDDocument: function (enclave, tokens) {
        return new NameDID_Document(enclave, tokens[3], tokens[4], false);
    }
};
