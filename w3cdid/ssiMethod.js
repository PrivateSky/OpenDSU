


function PK_DIDMethod(){
    let pkDocument = require("./pkDocument");
    this.create = function(SeedSSI, callback){
        callback(null, pkDocument.initiateDIDDocument(alias, SeedSSI));
    }

    this.resolve = function(tokens, callback){
        callback(null, pkDocument.createDIDDocument(tokens))
    }
}


function Alias_DIDMethod(){
    let aliasDocument = require("./aliasDocument");
    this.create = function(alias, SeedSSI, callback){
        callback(null, aliasDocument.initiateDIDDocument(alias, SeedSSI));
    }

    this.resolve = function(tokens, callback){
        callback(null, aliasDocument.createDIDDocument(tokens))
    }
}


function createPK_DIDMethod(){
    return new PK_DIDMethod();
}

function createAlias_DIDMethod(){
    return new Alias_DIDMethod();
}


module.exports = {
    createPK_DIDMethod,
    createAlias_DIDMethod
}