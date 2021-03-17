
/*
    W3CVC Mixin is abstracting a JWT based credential
    The same approach/interface can be used with credentials represented in other formats
 */

function W3CVC_Mixin(){
    let serialisation;
    /*
        Verify that the signature of the issuer is correct
     */
    this.load = function(vcSerialisationDocument, callback){
        serialisation = vcSerialisationDocument;
    };

    /*
        Verify that the signature of the issuer is correct
     */
    this.verify = function(callback){

    };

}

module.exports = W3CVC_Mixin;
