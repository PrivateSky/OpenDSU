const keySSIResolver = require("key-ssi-resolver");
const keySSIFactory = keySSIResolver.KeySSIFactory;

const HEADER_TYPE = "SeedSSIJWT";
const JWT_VALABILITY_SECONDS = 5 * 365 * 24 * 60 * 60; // 5 years default

const JWT_ERRORS = {
    EMPTY_JWT_PROVIDED: "EMPTY_JWT_PROVIDED",
    INVALID_JWT_FORMAT: "INVALID_JWT_FORMAT",
    INVALID_JWT_PRESENTATION: "INVALID_JWT_PRESENTATION",
    INVALID_JWT_HEADER: "INVALID_JWT_HEADER",
    INVALID_JWT_BODY: "INVALID_JWT_BODY",
    INVALID_JWT_HEADER_TYPE: "INVALID_JWT_HEADER_TYPE",
    INVALID_JWT_ISSUER: "INVALID_JWT_ISSUER",
    INVALID_CREDENTIALS_FORMAT: "INVALID_CREDENTIALS_FORMAT",
    JWT_TOKEN_EXPIRED: "JWT_TOKEN_EXPIRED",
    JWT_TOKEN_NOT_ACTIVE: "JWT_TOKEN_NOT_ACTIVE",
    INVALID_JWT_SIGNATURE: "INVALID_JWT_SIGNATURE",
    ROOT_OF_TRUST_VERIFICATION_FAILED: "ROOT_OF_TRUST_VERIFICATION_FAILED",
    EMPTY_LIST_OF_ISSUERS_PROVIDED: "EMPTY_LIST_OF_ISSUERS_PROVIDED",
};

function nowEpochSeconds() {
    return Math.floor(new Date().getTime() / 1000);
}

function createJWT({ seedSSI, scope, credentials, options, hash, encode, sign }, callback) {
    if(typeof seedSSI === "string"){
        const keyssiSpace = require('opendsu').loadApi("keyssi");
        try{
            seedSSI = keyssiSpace.parse(seedSSI);
        }catch(e){
            return callback(e);
        }
    }
    const sReadSSI = seedSSI.derive();

    let { subject, valability, ...optionsRest } = options || {};
    valability = valability || JWT_VALABILITY_SECONDS;

    if (credentials) {
        credentials = Array.isArray(credentials) ? credentials : [credentials];
    }

    const header = {
        typ: HEADER_TYPE,
    };

    const now = nowEpochSeconds();
    const body = {
        sub: subject || sReadSSI.getIdentifier(),
        // aud: encode(scope),
        scope,
        iss: sReadSSI.getIdentifier(),
        publicKey: seedSSI.getPublicKey(),
        iat: now,
        nbf: now,
        exp: now + valability,
        credentials,
        options: optionsRest,
    };

    const segments = [encode(JSON.stringify(header)), encode(JSON.stringify(body))];

    const jwtToSign = segments.join(".");

    hash(seedSSI, jwtToSign, (hashError, hashResult) => {
        if (hashError) return callback(hashError);

        sign(seedSSI, hashResult, (signError, signResult) => {
            if (signError) return callback(signError);
            const encodedSignResult = encode(signResult);

            const jwt = `${jwtToSign}.${encodedSignResult}`;
            callback(null, jwt);
        });
    });
}

function safeParseEncodedJson(decode, data) {
    try {
        const result = JSON.parse(decode(data));
        return result;
    } catch (e) {
        return e;
    }
}

function parseJWTSegments(jwt, decode, callback) {
    if (!jwt) return callback(JWT_ERRORS.EMPTY_JWT_PROVIDED);
    if (typeof jwt !== "string") return callback(JWT_ERRORS.INVALID_JWT_FORMAT);

    const segments = jwt.split(".");
    if (segments.length !== 3) return callback(JWT_ERRORS.INVALID_JWT_FORMAT);

    const header = safeParseEncodedJson(decode, segments[0]);
    if (header instanceof Error || !header) return callback(JWT_ERRORS.INVALID_JWT_HEADER);

    const body = safeParseEncodedJson(decode, segments[1]);
    if (body instanceof Error || !body) return callback(JWT_ERRORS.INVALID_JWT_BODY);

    const signatureInput = `${segments[0]}.${segments[1]}`;
    const signature = decode(segments[2]);
    if (!signature) {
        // the signature couldn't be decoded due to an invalid signature
        return callback(JWT_ERRORS.INVALID_JWT_SIGNATURE);
    }

    return callback(null, { header, body, signature, signatureInput });
}

function isJwtExpired(body) {
    return new Date(body.exp * 1000) < new Date();
}

function isJwtNotActive(body) {
    return new Date(body.nbf * 1000) >= new Date();
}

function verifyJWTContent(jwtContent, callback) {
    const { header, body } = jwtContent;

    if (header.typ !== HEADER_TYPE) return callback(JWT_ERRORS.INVALID_JWT_HEADER_TYPE);
    if (!body.iss) return callback(JWT_ERRORS.INVALID_JWT_ISSUER);
    if (isJwtExpired(body)) return callback(JWT_ERRORS.JWT_TOKEN_EXPIRED);
    if (isJwtNotActive(body)) return callback(JWT_ERRORS.JWT_TOKEN_NOT_ACTIVE);

    if (body.credentials && !Array.isArray(body.credentials)) return callback(JWT_ERRORS.INVALID_CREDENTIALS_FORMAT);

    callback(null);
}

const verifyJWT = ({ jwt, rootOfTrustVerificationStrategy, decode, verifySignature, hash }, callback) => {
    parseJWTSegments(jwt, decode, (parseError, jwtContent) => {
        if (parseError) return callback(parseError);

        verifyJWTContent(jwtContent, (verifyError) => {
            if (verifyError) return callback(verifyError);

            const { header, body, signatureInput, signature } = jwtContent;
            const { iss: sReadSSIString, publicKey } = body;

            const sReadSSI = keySSIFactory.create(sReadSSIString);

            hash(sReadSSI, signatureInput, (error, hash) => {
                if (error) return callback(error);
                verifySignature(sReadSSI, hash, signature, publicKey, (verifyError, verifyResult) => {
                    if (verifyError || !verifyResult) return callback(JWT_ERRORS.INVALID_JWT_SIGNATURE);

                    if (typeof rootOfTrustVerificationStrategy === "function") {
                        rootOfTrustVerificationStrategy({ header, body }, (verificationError, verificationResult) => {
                            if (verificationError || !verificationResult) {
                                return callback(JWT_ERRORS.ROOT_OF_TRUST_VERIFICATION_FAILED);
                            }
                            callback(null, true);
                        });
                        return;
                    }

                    callback(null, true);
                });
            });
        });
    });
};

module.exports = {
    createJWT,
    verifyJWT,
    JWT_ERRORS,
};
