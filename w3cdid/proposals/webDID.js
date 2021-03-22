

function WebDIDDocument(isInitialisation, url, seedSSI){
    let mixin =  require("../W3CDID_Mixin");
    let tokens;
    if(isInitialisation){
        tokens = alias;
        alias = undefined;
    }
    mixin(this);
    return this;
}

module.exports = {
    initiateDIDDocument:function(alias, seedSSI){
        new AliasDIDDocument(true, alias, seedSSI)
    },
    createDIDDocument:function(tokens){
        new AliasDIDDocument(false, tokens)
    }
};