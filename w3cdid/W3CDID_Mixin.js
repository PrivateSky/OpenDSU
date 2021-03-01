/*
    W3CDID Minxin is abstracting the DID document for OpenDSU compatible DID methods

    did:whatever   resolved to an OpenDSU abstraction: W3CDIDDocument
    verify signatures
    sign
    send and receive encrypted messages


 */

function W3CDID_Mixin(){
    this.getControllerKey = function(callback){

    };

    this.getPublicKeys = function(callback){

    };

    this.findPrivateKeysInSecurityContext = function(callback){

    };

    this.sign = function(hash, callback){

    };

    this.verify = function(hash, signature, callback){

    };


    this.sendMessage = function(message, toOtherDID, callback){

    };

    this.getMQHandler = function(callback){

    };
}

module.exports.W3CDID_Mixin = W3CDID_Mixin;