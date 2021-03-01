

function PKDIDDocument(isInitialisation, seedSSI){
    let mixin =  require("./W3CDID_Mixin");
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
        new PKDIDDocument(true, seedSSI)
    },
    createDIDDocument:function(tokens){
        new PKDIDDocument(false, tokens)
    }
};