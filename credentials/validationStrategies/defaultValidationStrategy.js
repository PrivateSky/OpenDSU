const {JWT_ERRORS} = require("../constants");
const utils = require("../utils");

class DefaultValidationStrategy {

    /**
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

        const {atDate, credentialPublicClaims, subjectClaims} = environmentData;
        const arePublicClaimsValid = utils.validateClaims(credentialPublicClaims, verifiableCredential);
        if (!arePublicClaimsValid) return callback(undefined, false);
        const areSubjectClaimsValid = utils.validateClaims(subjectClaims, verifiableCredential.vc.credentialSubject);
        if (!areSubjectClaimsValid) return callback(undefined, false);

        if (utils.isJWTExpired(verifiableCredential, atDate)) return callback(JWT_ERRORS.JWT_TOKEN_EXPIRED, false);
        if (utils.isJWTNotActive(verifiableCredential, atDate)) return callback(JWT_ERRORS.JWT_TOKEN_NOT_ACTIVE, false);

        callback(undefined, true);
    }

    /**
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

        const {atDate, presentationPublicClaims} = environmentData;
        const arePublicClaimsValid = utils.validateClaims(presentationPublicClaims, verifiablePresentation);
        if (!arePublicClaimsValid) return callback(undefined, false);

        if (utils.isJWTExpired(verifiablePresentation, atDate)) return callback(JWT_ERRORS.JWT_TOKEN_EXPIRED, false);
        if (utils.isJWTNotActive(verifiablePresentation, atDate)) return callback(JWT_ERRORS.JWT_TOKEN_NOT_ACTIVE, false);

        const credentialValidatorChain = (jwtVcList) => {
            if (jwtVcList.length === 0) {
                return callback(undefined, true);
            }

            const jwtVc = jwtVcList.shift();
            this.validateCredential(jwtVc, environmentData, (err, isValidCredential) => {
                if (err) return callback(err);
                if (!isValidCredential) return callback(undefined, false);

                credentialValidatorChain(jwtVcList);
            });
        };
        credentialValidatorChain(verifiablePresentation.vp.verifiableCredential);
    }
}

module.exports = DefaultValidationStrategy;