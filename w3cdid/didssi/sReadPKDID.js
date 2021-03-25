

function sReadPKDocument(isInitialisation, seedSSI){
    let mixin =  require("../W3CDID_Mixin");
    let tokens;
    if(isInitialisation){
        tokens = seedSSI;
        seedSSI = undefined;
    }
    mixin(this);
    return this;
}

module.exports = {
    initiateDIDDocument:function(seedSSI){
        return new sReadPKDocument(true, seedSSI)
    },
    createDIDDocument:function(tokens){
        return new sReadPKDocument(false, tokens)
    }
};