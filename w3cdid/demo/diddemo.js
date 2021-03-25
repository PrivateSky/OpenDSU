

function DemoPKDocument(identifier){
    let mixin =  require("../W3CDID_Mixin");
    mixin(this);

    this.sign = function(hash, callback){
        return "hash";
    };

    this.verify = function(hash, signature, callback){
        callback(undefined, hash == signature);
    };


    this.sendMessage = function(message, toOtherDID, callback){

    };

    this.on = function(callback){

    };

    return this;
}

function DEMO_DIDMethod(){
    let aliasDocument = require("../proposals/aliasDocument");
    this.create = function(identifier, callback){
        callback(null, new DemoPKDocument(identifier));
    }

    this.resolve = function(tokens, callback){
        callback(null, new DemoPKDocument(tokens[2]));
    }
}

module.exports.create_demo_DIDMethod = DEMO_DIDMethod;
