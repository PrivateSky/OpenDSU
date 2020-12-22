const keySSIResolver = require("key-ssi-resolver");
const cryptoRegistry = keySSIResolver.CryptoAlgorithmsRegistry;
const SSITypes = keySSIResolver.SSITypes;
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
    INVALID_SSI_PROVIDED: "INVALID_SSI_PROVIDED"
};

const templateSeedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);
templateSeedSSI.load(SSITypes.SEED_SSI, "default");

function encodeBase58(data) {
    return cryptoRegistry.getEncodingFunction(templateSeedSSI)(data).toString();
};
function decodeBase58(data, keepBuffer) {
    const decodedValue = cryptoRegistry.getDecodingFunction(templateSeedSSI)(data);
    if (keepBuffer) {
        return decodedValue;
    }
    return decodedValue ? decodedValue.toString() : null;
};

function nowEpochSeconds() {
    return Math.floor(new Date().getTime() / 1000);
}

function getReadableSSI(ssi) {
    if (typeof ssi === "string" && ssi.indexOf('ssi') === 0) {
        // ssi is actually the readable ssi
        return ssi;
    }

    ssi = ssi.getIdentifier ? ssi.getIdentifier() : ssi;
    let readableSSI = decodeBase58(ssi);
    if (!readableSSI) {
        // invalid base58 string
        return null;
    }
    if (readableSSI.indexOf('ssi') !== 0) {
        // invalid ssi format
        return null;
    }

    return readableSSI;
}

function createJWT({ seedSSI, scope, credentials, options, hash, sign }, callback) {
    if (typeof seedSSI === "string") {
        const keyssiSpace = require('opendsu').loadApi("keyssi");
        try {
            seedSSI = keyssiSpace.parse(seedSSI);
        } catch (e) {
            return callback(e);
        }
    }
    const sReadSSI = seedSSI.derive();

    let { subject, valability, ...optionsRest } = options || {};
    valability = valability || JWT_VALABILITY_SECONDS;

    if (subject) {
        subject = getReadableSSI(subject);
    } else {
        subject = sReadSSI.getIdentifier(true);
    }
    if (!subject) {
        return callback(JWT_ERRORS.INVALID_SSI_PROVIDED);
    }

    const issuer = sReadSSI.getIdentifier(true);
    if (!issuer) {
        return callback(JWT_ERRORS.INVALID_SSI_PROVIDED);
    }

    if (credentials) {
        credentials = Array.isArray(credentials) ? credentials : [credentials];
    }

    const header = {
        typ: HEADER_TYPE,
    };

    const now = nowEpochSeconds();
    const body = {
        sub: subject,
        // aud: encodeBase58(scope),
        scope,
        iss: issuer,
        publicKey: seedSSI.getPublicKey(),
        iat: now,
        nbf: now,
        exp: now + valability,
        credentials,
        options: optionsRest,
    };

    const segments = [encodeBase58(JSON.stringify(header)), encodeBase58(JSON.stringify(body))];

    const jwtToSign = segments.join(".");

    hash(seedSSI, jwtToSign, (hashError, hashResult) => {
        if (hashError) return callback(hashError);

        sign(seedSSI, hashResult, (signError, signResult) => {
            if (signError || !signResult) return callback(signError);
            const encodedSignResult = encodeBase58(signResult);

            const jwt = `${jwtToSign}.${encodedSignResult}`;
            callback(null, jwt);
        });
    });
}

function safeParseEncodedJson(data, keepBuffer) {
    try {
        const result = JSON.parse(decodeBase58(data, keepBuffer));
        return result;
    } catch (e) {
        return e;
    }
}

function parseJWTSegments(jwt, callback) {
    if (!jwt) return callback(JWT_ERRORS.EMPTY_JWT_PROVIDED);
    if (typeof jwt !== "string") return callback(JWT_ERRORS.INVALID_JWT_FORMAT);

    const segments = jwt.split(".");
    if (segments.length !== 3) return callback(JWT_ERRORS.INVALID_JWT_FORMAT);

    const header = safeParseEncodedJson(segments[0]);
    if (header instanceof Error || !header) return callback(JWT_ERRORS.INVALID_JWT_HEADER);

    const body = safeParseEncodedJson(segments[1]);
    if (body instanceof Error || !body) return callback(JWT_ERRORS.INVALID_JWT_BODY);

    const signatureInput = `${segments[0]}.${segments[1]}`;
    const signature = decodeBase58(segments[2], true);
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

const verifyJWT = ({ jwt, rootOfTrustVerificationStrategy, verifySignature, hash }, callback) => {
    parseJWTSegments(jwt, (parseError, jwtContent) => {
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
    getReadableSSI,
    parseJWTSegments,
    JWT_ERRORS,
};
