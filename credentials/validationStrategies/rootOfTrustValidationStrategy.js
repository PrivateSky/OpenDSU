const {JWT_ERRORS, LABELS} = require("../constants");
const utils = require("../utils");

class RootOfTrustValidationStrategy {

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

        const iss = verifiableCredential.iss;
        const issuerFormat = utils.getIssuerFormat(iss);
        const {rootsOfTrust, credentialPublicClaims, subjectClaims} = environmentData;

        const arePublicClaimsValid = utils.validateClaims(credentialPublicClaims, verifiableCredential);
        if (!arePublicClaimsValid) return callback(undefined, false);
        const areSubjectClaimsValid = utils.validateClaims(subjectClaims, verifiableCredential.vc.credentialSubject);
        if (!areSubjectClaimsValid) return callback(undefined, false);

        if (rootsOfTrust.length === 0) return callback(JWT_ERRORS.ROOT_OF_TRUST_NOT_VALID, false);
        if (!iss || issuerFormat !== LABELS.ISSUER_DID) return callback(JWT_ERRORS.INVALID_ISSUER_FORMAT, false);
        if (rootsOfTrust.findIndex(rootOfTrust => rootOfTrust === iss) === -1) return callback(JWT_ERRORS.ROOT_OF_TRUST_NOT_VALID, false);

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

        const {presentationPublicClaims} = environmentData;
        const arePublicClaimsValid = utils.validateClaims(presentationPublicClaims, verifiablePresentation);
        if (!arePublicClaimsValid) return callback(undefined, false);

        const credentialValidatorChain = (jwtVcList) => {
            if (jwtVcList.length === 0) {
                return callback(undefined, true);
            }

            const jwtVc = jwtVcList.shift();
            this.validateCredential(jwtVc, environmentData, (err, isValidCredential) => {
                if (err) return callback(err);
                if (!isValidCredential) return callback(undefined, isValidCredential);

                credentialValidatorChain(jwtVcList);
            });
        };
        credentialValidatorChain(verifiablePresentation.vp.verifiableCredential);
    }
}

module.exports = RootOfTrustValidationStrategy;