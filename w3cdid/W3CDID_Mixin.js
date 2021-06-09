/*
    W3CDID Minxin is abstracting the DID document for OpenDSU compatible DID methods

    did:whatever   resolved to an OpenDSU abstraction: W3CDIDDocument
    verify signatures
    sign
    send and receive encrypted messages


 */

function W3CDID_Mixin(target) {

    const securityContext = require("../index").loadAPI("sc").getSecurityContext();
    target.findPrivateKeysInSecurityContext = function (callback) {

    };

    target.sign = function (hash, callback) {
        securityContext.signAsDID(target, hash, callback);
    };

    target.verify = function (hash, signature, callback) {
        securityContext.verifyForDID(target, hash, signature, callback);
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

    target.encrypt = function (message, forDID, callback) {

    };

    target.decrypt = function (callback) {

    };

    /* messages to the APiHUb MQ compatible APIs

    * */
    target.sendMessage = function (message, toOtherDID, callback) {

    };

    target.on = function (callback) {

    };

    target.revokeDID = function (callback) {

    };

    target.revokeKey = function (key, callback) {

    };

    target.getControllerKey = function (callback) {

    };

    target.getPublicKeys = function (callback) {

    };

}

module.exports = W3CDID_Mixin;
