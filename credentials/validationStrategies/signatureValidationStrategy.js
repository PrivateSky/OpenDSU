const utils = require("../utils");

class SignatureValidationStrategy {
    /**
     * This method is validating a credential according to a specific defined validation strategy.
     * @param verifiableCredential {string|{jwtHeader:Object, jwtPayload:Object, jwtSignature:string}} - The complete JWT Verifiable Credential in base64UrlEncode format or already decoded
     * @param environmentData {Object} object with arbitrary data required for validation. If present, validations of the claims must be performed
     * @param callback {Function}
     */
    validateCredential(verifiableCredential, environmentData, callback) {
        // If the JWTVc is in base64UrlEncode format, we need to decode it
        if (typeof verifiableCredential === "string") {
            return utils.parseJWTSegments(verifiableCredential, (err, result) => {
                if (err) return callback(err, false);
                this.validateCredential(result, environmentData, callback);
            });
        }

        const {jwtPayload} = verifiableCredential;
        const {credentialPublicClaims, subjectClaims} = environmentData;
        const arePublicClaimsValid = utils.validateClaims(credentialPublicClaims, jwtPayload);
        if (!arePublicClaimsValid) return callback(undefined, false);
        const areSubjectClaimsValid = utils.validateClaims(subjectClaims, jwtPayload.vc.credentialSubject);
        if (!areSubjectClaimsValid) return callback(undefined, false);

        // const {kid} = verifiableCredential.jwtHeader;
        // TODO: Using kid value (which in this case will be the verifier's DID), the verifier will be able to validate the signature.
        //  The signature is made using asymmetric encryption using kid.

        callback(undefined, true);
    }

    /**
     * This method is validating a presentation according to a specific defined validation strategy.
     * @param verifiablePresentation {string|{jwtHeader:Object, jwtPayload:Object, jwtSignature:string}} - The complete JWT Verifiable Credential in base64UrlEncode format or already decoded
     * @param environmentData {Object} object with arbitrary data required for validation. If present, validations of the claims must be performed
     * @param callback {Function}
     */
    validatePresentation(verifiablePresentation, environmentData, callback) {
        // If the JWTVp is in base64UrlEncode format, we need to decode it
        if (typeof verifiablePresentation === "string") {
            return utils.parseJWTSegments(verifiablePresentation, (err, result) => {
                if (err) return callback(err, false);
                this.validatePresentation(result, environmentData, callback);
            });
        }

        const {jwtPayload} = verifiablePresentation;
        const {presentationPublicClaims} = environmentData;
        const arePublicClaimsValid = utils.validateClaims(presentationPublicClaims, jwtPayload);
        if (!arePublicClaimsValid) return callback(undefined, false);

        // const {kid} = verifiablePresentation.jwtHeader;
        // TODO: Using kid value (which in this case will be the verifier's DID), the verifier will be able to validate the signature.
        //  The signature is made using asymmetric encryption using kid.

        callback(undefined, true);
    }
}

module.exports = SignatureValidationStrategy;