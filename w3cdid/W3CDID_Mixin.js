/*
    W3CDID Minxin is abstracting the DID document for OpenDSU compatible DID methods

    did:whatever   resolved to an OpenDSU abstraction: W3CDIDDocument
    verify signatures
    sign
    send and receive encrypted messages


 */

function W3CDID_Mixin(){


    this.findPrivateKeysInSecurityContext = function(callback){

    };

    this.sign = function(hash, callback){

    };

    this.verify = function(hash, signature, callback){

    };


    /*Elliptic Curve Integrated Encryption Scheme
    * https://github.com/bin-y/standard-ecies/blob/master/main.js
    * https://www.npmjs.com/package/ecies-lite  //try to use functions from SSI and from crypto
    * https://github.com/ecies/js
    * https://github.com/sigp/ecies-parity
    * https://github.com/pedrouid/eccrypto-js
    *
    * annoncrypt  - symertric enc (IES)
    * authcrypt   -  asymetric enc + sign
    * plaintext   + asym sign
    *
    * A -> B   sign(enc( ASYM_PK_B, M), PK_A)
    * */

    this.encrypt = function(message, forDID, callback){

    };

    this.decrypt = function(callback){

    };

    /* messages to the APiHUb MQ compatible APIs

    * */
    this.sendMessage = function(message, toOtherDID, callback){

    };

    this.getMQHandler = function(callback){

    };

    this.revokeDID = function(callback){

    };

    this.revokeKey = function(key, callback){

    };

    this.getControllerKey = function(callback){

    };

    this.getPublicKeys = function(callback){

    };

}

module.exports = W3CDID_Mixin;
