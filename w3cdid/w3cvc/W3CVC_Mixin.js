
/*
    JWT_VC the actual implementation of the  a JWT based credential
    The same approach/interface can be used with credentials represented in other formats
 */

function JWT_VC(){
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
    this.addClaims = function(claims){
        serialisation = vcSerialisationDocument;
    };
    /*
        Verify that the signature of the issuer is correct
     */
    this.verify = function(callback){

    };

    /*
        returns the credential in JWT format (signed by the issuerDID)
     */
    this.toJWT = function(issuerDID){

    };
}

module.exports = JWT_VC;
