const {JWT_ERRORS, getDefaultJWTOptions} = require("./jwtConstants");
const {getReadableIdentity, parseJWTSegments} = require("./jwtUtils");
const {jwtBuilder, getIssuerFormat, getSubjectFormat} = require("./jwtModel");
const JwtVC = require("./jwtVc");

/**
 * This method prepares the initial JWT options object based on the inputs. <br />
 * Points to the specific create JWT method according to the subject type
 * @param issuer {string | KeySSI | DIDDocument} - KeySSI or DID
 * @param subject {string | KeySSI | DIDDocument} - KeySSI or DID
 * @param options {Object | Function}
 * @param callback {?Function}
 */
function createJWT(issuer, subject, options, callback) {
    if (typeof options === "function") {
        callback = options;
    }
    options = Object.assign({}, getDefaultJWTOptions(), options);

    try {
        issuer = getReadableIdentity(issuer);
        subject = getReadableIdentity(subject);
        if (!issuer) return callback(JWT_ERRORS.INVALID_ISSUER_FORMAT);
        if (!subject) return callback(JWT_ERRORS.INVALID_SUBJECT_FORMAT);

        const issuerFormat = getIssuerFormat(issuer);
        if (!issuerFormat) return callback(JWT_ERRORS.INVALID_ISSUER_FORMAT);

        const subjectFormat = getSubjectFormat(subject);
        if (!subjectFormat) return callback(JWT_ERRORS.INVALID_SUBJECT_FORMAT);

        const {jwtHeader, jwtPayload, encodedJwtHeaderAndBody} = jwtBuilder(issuer, subject, options);
        const jwtInstance = new JwtVC(issuer, issuerFormat, [jwtHeader, jwtPayload], encodedJwtHeaderAndBody);
        jwtInstance.signJWT((err, signResult) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, jwtInstance);
        });
    } catch (e) {
        callback(e);
    }
}

/**
 * This method is parsing an encoded JWT, verifying and then returns a JWT instance. <br />
 * If any inconsistency is present, error is thrown.
 * @param encodedJwt {string}
 * @param callback {Function}
 */
function resolveJWT(encodedJwt, callback) {
    try {
        parseJWTSegments(encodedJwt, (err, jwtSegments) => {
            if (err) {
                return callback(err);
            }

            const {jwtHeader, jwtPayload, jwtSignature, encodedJwtHeaderAndBody} = jwtSegments;
            const issuer = jwtPayload.iss;
            const issuerFormat = getIssuerFormat(issuer);
            if (!issuerFormat) return callback(JWT_ERRORS.INVALID_ISSUER_FORMAT);

            const jwtInstance = new JwtVC(issuer, issuerFormat, [jwtHeader, jwtPayload], encodedJwtHeaderAndBody, jwtSignature);
            jwtInstance.verifyJWT((err, verifyResult) => {
                if (err) {
                    return callback(err);
                }

                callback(undefined, jwtInstance);
            });
        });
    } catch (e) {
        callback(e);
    }
}

module.exports = {
    createJWT,
    resolveJWT,

    getReadableIdentity,
    parseJWTSegments,

    JWT_ERRORS
};