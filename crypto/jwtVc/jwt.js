const {getIssuerFormat, getSubjectFormat} = require("./jwtUtils");
const {JWT_ERRORS, JWT_LABELS, getDefaultJWTOptions} = require("./jwtConstants");
const {prepareJWTSegments, parseJWTSegments} = require("./jwtModel");

/**
 * This method creates a JWT based on an SSI
 * @param jwtHeader {Object}
 * @param jwtPayload {Object}
 * @param jwtEncodedSegments {[string]}
 * @param jwtOptions {Object}
 * @param callback {Function}
 */
function createSsiJwt({jwtHeader, jwtPayload, jwtEncodedSegments}, jwtOptions, callback) {

    const jwt = jwtEncodedSegments.join(".");
    callback(undefined, jwt);
}

/**
 * This method creates a JWT based on a DID Identifier
 * @param jwtHeader {Object}
 * @param jwtPayload {Object}
 * @param jwtEncodedSegments {[string]}
 * @param jwtOptions {Object}
 * @param callback {Function}
 */
function createDidJwt({jwtHeader, jwtPayload, jwtEncodedSegments}, jwtOptions, callback) {

    const jwt = jwtEncodedSegments.join(".");
    callback(undefined, jwt);
}

/**
 * This method is signing the encoded header and payload of a JWT and returns the full signed JWT (header.payload.signature)
 * The JWT will be signed according to the provided algorithm (KeySSI, DID, Standard encryption algorithms)
 * @param jwtEncodedSegments {[string]}
 * @param alg {string} - The algorithm to sign
 * @param secret {string} - The secret used on sign
 * @param callback {Function}
 */
function signJWT(jwtEncodedSegments, alg, secret, callback) {

}

/**
 * This method prepares the initial JWT options object based on the inputs. <br />
 * Points to the specific create JWT method according to the subject type
 * @param issuer {string | Object}
 * @param subject {string}
 * @param options {Object | Function}
 * @param callback {Function}
 */
function vc_createJWT(issuer, subject, options, callback) {
    if (typeof options === "function") {
        callback = options;
        options = {};
    }

    options = Object.assign({}, getDefaultJWTOptions(), options);
    const issuerFormat = getIssuerFormat(issuer);
    if (!issuerFormat) {
        return callback(JWT_ERRORS.INVALID_ISSUER_FORMAT);
    }

    const subjectFormat = getSubjectFormat(subject);
    if (!subjectFormat) {
        return callback(JWT_ERRORS.INVALID_SUBJECT_FORMAT);
    }

    const jwtOptions = {
        sub: subject,
        iss: issuer,
        ...options
    };

    const {jwtHeader, jwtPayload, jwtEncodedSegments} = prepareJWTSegments(jwtOptions);
    switch (subjectFormat) {
        case JWT_LABELS.SUBJECT_SSI:
            return createSsiJwt({jwtHeader, jwtPayload, jwtEncodedSegments}, jwtOptions, callback);

        case JWT_LABELS.SUBJECT_DID:
            return createDidJwt({jwtHeader, jwtPayload, jwtEncodedSegments}, jwtOptions, callback);

        default:
            return callback(JWT_ERRORS.INVALID_SUBJECT_FORMAT);
    }
}

/**
 * This method is used to check if a JWT is valid and trusted
 * @param jwt {string}
 * @param callback {Function}
 */
function vc_verifyJWT(jwt, callback) {
    parseJWTSegments(jwt, (err, jwtSegments) => {
        if (err) {
            return callback(err);
        }

        callback(undefined, true);
    });
}

/**
 * This method verifies a JWT and returns the decoded segments.
 * @param jwt {string}
 * @param callback {Function}
 */
function prepareJWTForEmbed(jwt, callback) {
    vc_verifyJWT(jwt, (err, isValidJWT) => {
        if (err) {
            return callback(err);
        }

        if (!isValidJWT) {
            return callback(JWT_ERRORS.EMPTY_JWT_PROVIDED);
        }

        parseJWTSegments(jwt, (err, jwtSegments) => {
            if (err) {
                return callback(err);
            }

            // TODO: verify signature
            callback(undefined, jwtSegments);
        });
    });
}

/**
 * This method embeds one or more public claims about the JWT. These claims are not reflected within VC body
 * @param jwt {string}
 * @param claimOptions {Object}
 * @param callback {Function}
 */
function vc_embedClaim(jwt, claimOptions, callback) {
    prepareJWTForEmbed(jwt, (err, jwtSegments) => {
        if (err) {
            return callback(err);
        }

        // TODO: 1. claimOptions should be an object {key:value} with the claims to be embedded
        //  2. Update the claim
        //  3. Encode new JWT
        //  4. Send back the new JWT
        const newJWT = jwt;
        callback(undefined, newJWT);
    });
}

/**
 * This method embeds a new claim about the subject(s) of the JWT
 * @param jwt {string}
 * @param claimOptions {{context:string, type:string, claim:{}, subject:string|null}}
 * @param callback {Function}
 */
function vc_embedCredentialSubjectClaim(jwt, claimOptions, callback) {
    prepareJWTForEmbed(jwt, (err, jwtSegments) => {
        if (err) {
            return callback(err);
        }

        // TODO: 1. Check if claimOptions is valid.
        //  2. Update the claim
        //     2.1. If subject is present, it must be a valid DID/SSI and to be part of the current VC body
        //  3. Encode new JWT
        //  4. Send back the new JWT
        // Allowed structure: {context:string(URI), type:string, subject:string, claim:{}}
        const newJWT = jwt;
        callback(undefined, newJWT);
    });
}

module.exports = {
    vc_createJWT,
    vc_verifyJWT,

    vc_embedClaim,
    vc_embedCredentialSubjectClaim,

    vc_parseJWTSegments: parseJWTSegments,

    vc_JWT_ERRORS: JWT_ERRORS
};