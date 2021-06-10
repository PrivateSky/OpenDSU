function NameDIDDocument(domain, name) {
    if (typeof domain === "undefined" || typeof name === "undefined") {
        throw Error(`Invalid number of arguments. Expected blockchain domain and group name.`);
    }

    let mixin = require("./ConstDID_Mixin");
    mixin(this, domain, name);
    const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;

    this.getIdentifier = () => {
        return `did:ssi:name:${domain}:${name}`;
    };

    this.getName = () => {
        return name;
    };

    bindAutoPendingFunctions(this, ["init", "getIdentifier", "getName", "getPrivateKeys"]);
    this.init();
    return this;
}


module.exports = {
    initiateDIDDocument: function (domain, name) {
        return new NameDIDDocument(domain, name)
    },
    createDIDDocument: function (tokens) {
        return new NameDIDDocument(tokens[3], tokens[4]);
    }
};
