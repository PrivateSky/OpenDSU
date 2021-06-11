function SReadDID_Document(isInitialisation, seedSSI) {
    let mixin = require("../W3CDID_Mixin");
    let tokens;
    if (isInitialisation) {
        tokens = seedSSI;
        seedSSI = undefined;
    }
    mixin(this);
    return this;
}

module.exports = {
    initiateDIDDocument: function (seedSSI) {
        return new SReadDID_Document(true, seedSSI)
    },
    createDIDDocument: function (tokens) {
        return new SReadDID_Document(false, tokens)
    }
};
