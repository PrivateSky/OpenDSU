const utils = require("../utils");

class SignatureValidationStrategy {
    /**
     * This method is validating a credential according to a specific defined validation strategy.
     * @param verifiableCredential {string|Object} - Either an encoded JWTVc, or decoded JWTVc as result of the verification
     * @param environmentData {Object} object with arbitrary data required for validation
     * @param callback {Function}
     */
    validateCredential(verifiableCredential, environmentData, callback) {
        if (typeof verifiableCredential === "string") {
            return utils.parseJWTSegments(verifiableCredential, (err, result) => {
                if (err) return callback(err, false);
                this.validateCredential(result.jwtPayload, environmentData, callback);
            });
        }

        const {credentialPublicClaims, subjectClaims} = environmentData;
        const arePublicClaimsValid = utils.validateClaims(credentialPublicClaims, verifiableCredential);
        if (!arePublicClaimsValid) return callback(undefined, false);
        const areSubjectClaimsValid = utils.validateClaims(subjectClaims, verifiableCredential.vc.credentialSubject);
        if (!areSubjectClaimsValid) return callback(undefined, false);


        callback(undefined, true);
    }

    /**
     * This method is validating a presentation according to a specific defined validation strategy.
     * @param verifiablePresentation {string|Object} - Either an encoded JWTVp, or decoded JWTVp as result of the verification
     * @param environmentData {Object} object with arbitrary data required for validation
     * @param callback {Function}
     */
    validatePresentation(verifiablePresentation, environmentData, callback) {
        if (typeof verifiablePresentation === "string") {
            return utils.parseJWTSegments(verifiablePresentation, (err, result) => {
                if (err) return callback(err, false);
                this.validatePresentation(result.jwtPayload, environmentData, callback);
            });
        }

        const {presentationPublicClaims} = environmentData;
        const arePublicClaimsValid = utils.validateClaims(presentationPublicClaims, verifiablePresentation);
        if (!arePublicClaimsValid) return callback(undefined, false);

        callback(undefined, true);
    }
}

module.exports = SignatureValidationStrategy;