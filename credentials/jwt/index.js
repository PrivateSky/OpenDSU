const {JWT_ERRORS, IMMUTABLE_PUBLIC_CLAIMS} = require("./constants");
const {dateTimeFormatter, isValidURL} = require("../utils");
const {
    jwtBuilder,
    jwtParser,
    jwtEncoder,
    parseJWTSegments,
    getReadableIdentity
} = require("./model");

function JwtVC(options, isInitialisation = false) {

    const observableMixin = require("../../utils/ObservableMixin");
    observableMixin(this);

    this.init = () => {
        if (isInitialisation === true) {
            jwtBuilder(options, (err, encodedJWT) => {
                if (err) {
                    return this.dispatchEvent("error", err);
                }

                this.encodedJWT = encodedJWT;
                this.dispatchEvent("initialised");
            });
        } else {
            jwtParser(options.encodedJWT, (err) => {
                if (err) {
                    return this.dispatchEvent("error", err);
                }

                this.encodedJWT = options.encodedJWT;
                this.dispatchEvent("initialised");
            });
        }
    };

    this.getJWT = () => {
        // sign before sending?
        return this.encodedJWT;
    };

    /**
     * This method embeds one or more public claims about the JWT. These claims are not reflected within VC body
     * @param claimOptions {Object}
     * @param callback
     */
    this.embedClaim = (claimOptions, callback) => {
        if (typeof claimOptions !== "object") {
            return callback(JWT_ERRORS.INVALID_PUBLIC_CLAIM);
        }

        const claimsToEmbed = Object.keys(claimOptions);
        for (let index = 0; index < claimsToEmbed.length; ++index) {
            const hasImmutableClaim = IMMUTABLE_PUBLIC_CLAIMS.findIndex(cl => cl === claimsToEmbed[index]) !== -1;
            if (hasImmutableClaim) {
                return callback(JWT_ERRORS.IMMUTABLE_PUBLIC_CLAIM);
            }
        }

        parseJWTSegments(this.encodedJWT, (err, result) => {
            if (err) {
                return callback(err);
            }

            const {jwtHeader, jwtPayload, jwtSignature} = result;
            Object.assign(jwtPayload, claimOptions);
            if (claimsToEmbed.nbf) {
                jwtPayload.vc.issuanceDate = dateTimeFormatter(claimsToEmbed.nbf);
            }
            if (claimsToEmbed.exp) {
                jwtPayload.vc.expirationDate = dateTimeFormatter(claimsToEmbed.exp);
            }

            this.encodedJWT = jwtEncoder(jwtHeader, jwtPayload, jwtSignature);

            callback(undefined, true);
        });
    };

    /**
     * This method is used to extend the expiration date of a JWT
     * @param timeInSeconds {Number}
     * @param callback
     */
    this.extendExpirationDate = (timeInSeconds, callback) => {
        if (timeInSeconds <= 0) {
            return callback(JWT_ERRORS.INVALID_EXPIRATION_DATE);
        }

        parseJWTSegments(this.encodedJWT, (err, result) => {
            if (err) {
                return callback(err);
            }

            const {jwtHeader, jwtPayload, jwtSignature} = result;
            jwtPayload.exp = jwtPayload.exp + timeInSeconds * 1000;
            jwtPayload.vc.expirationDate = dateTimeFormatter(jwtPayload.exp.exp);
            this.encodedJWT = jwtEncoder(jwtHeader, jwtPayload, jwtSignature);

            callback(undefined, true);
        });
    };

    /**
     * This method embeds a new claim about the subject(s) of the JWT.
     * Subject is mandatory if credentialSubject is an array of subjects. (To be extended tp crete JWT based on multiple subjects)
     * @param claimOptions {{context:string, type:string, claims:{}, subject:string|null}}
     * @param callback
     */
    this.embedCredentialSubjectClaim = (claimOptions, callback) => {
        if (typeof claimOptions !== "object" || !claimOptions.context || !claimOptions.type || !claimOptions.claims
            || typeof claimOptions.context !== "string" || typeof claimOptions.type !== "string"
            || typeof claimOptions.claims !== "object" || !isValidURL(claimOptions.context)) {
            return callback(JWT_ERRORS.INVALID_SUBJECT_CLAIM);
        }

        if (claimOptions.claims.id) {
            return callback(JWT_ERRORS.IMMUTABLE_PUBLIC_CLAIM);
        }

        parseJWTSegments(this.encodedJWT, (err, result) => {
            if (err) {
                return callback(err);
            }

            const {jwtHeader, jwtPayload, jwtSignature} = result;
            const vc = jwtPayload.vc;
            if (Array.isArray(vc.credentialSubject)) {
                if (!claimOptions.subject) {
                    return callback(JWT_ERRORS.INVALID_SUBJECT_CLAIM);
                }
                if (typeof claimOptions.subject !== "string") {
                    return callback(JWT_ERRORS.INVALID_SUBJECT_CLAIM);
                }

                const targetSubjectIndex = vc.credentialSubject.findIndex(subject => subject.id === subject);
                if (targetSubjectIndex === -1) {
                    return callback(JWT_ERRORS.INVALID_SUBJECT_CLAIM);
                }

                Object.assign(vc.credentialSubject[targetSubjectIndex], claimOptions.claims);
            } else {
                Object.assign(vc.credentialSubject, claimOptions.claims);
            }

            vc["@context"].push(claimOptions.context);
            vc.type.push(claimOptions.type);
            jwtPayload.vc = JSON.parse(JSON.stringify(vc));
            this.encodedJWT = jwtEncoder(jwtHeader, jwtPayload, jwtSignature);

            callback(undefined, true);
        });
    };

    setTimeout(() => {
        this.init();
    });
}

/**
 * This method prepares the initial JWT options object based on the inputs. <br />
 * Points to the specific create JWT method according to the subject type
 * @param options {Object}
 */
function createJWT(options) {
    return new JwtVC(options, true);
}

/**
 * This method is parsing an encoded verifiable credential according to the requested type and returns the instance of the verifiable credential. <br />
 * @param encodedJWT {string}
 */
function resolveJWT(encodedJWT) {
    const options = {encodedJWT: encodedJWT};
    return new JwtVC(options);
}

module.exports = {
    createJWT,
    resolveJWT,

    getReadableIdentity,
    parseJWTSegments,

    JWT_ERRORS
};