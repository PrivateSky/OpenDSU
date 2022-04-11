const JWT_ERRORS = {
    EMPTY_JWT_PROVIDED: "EMPTY_JWT_PROVIDED",
    INVALID_JWT_FORMAT: "INVALID_JWT_FORMAT",
    INVALID_JWT_HEADER: "INVALID_JWT_HEADER",
    INVALID_JWT_HEADER_TYPE: "INVALID_JWT_HEADER_TYPE",
    INVALID_JWT_PAYLOAD: "INVALID_JWT_PAYLOAD",
    INVALID_JWT_SIGNATURE: "INVALID_JWT_SIGNATURE",
    INVALID_ISSUER_FORMAT: "INVALID_ISSUER_FORMAT",
    INVALID_SUBJECT_FORMAT: "INVALID_SUBJECT_FORMAT",
    INVALID_EXPIRATION_DATE: "INVALID_EXPIRATION_DATE",
    INVALID_PUBLIC_CLAIM: "INVALID_PUBLIC_CLAIM",
    INVALID_SUBJECT_CLAIM: "INVALID_SUBJECT_CLAIM",
    IMMUTABLE_PUBLIC_CLAIM: "IMMUTABLE_PUBLIC_CLAIM"
};

const JWT_DEFAULTS = {
    ALG: "ES256",
    TYP: "JWT",
    VC_CONTEXT_CREDENTIALS: "https://www.w3.org/2018/credentials/v1",
    VC_TYPE: "VerifiableCredential",
    EXP: (5 * 365 * 24 * 60 * 60), // 5 years default,
    EMPTY_VC: {
        context: [], type: []
    }
};

const JWT_LABELS = {
    SEED_SSI_HEADER_TYPE: "SeedSSIJWT",
    DID_HEADER_TYPE: "DID_JWT",
    ISSUER_DID: "issuerDID",
    ISSUER_SSI: "issuerSSI",
    SUBJECT_DID: "subjectDID",
    SUBJECT_SSI: "subjectSSI",
}

function getDefaultJWTOptions() {
    const now = new Date().getTime();
    return {
        iat: now, nbf: now, exp: now + JWT_DEFAULTS.EXP
    };
}

const IMMUTABLE_PUBLIC_CLAIMS = ["vc", "vp", "iss", "sub", "iat"];

module.exports = {
    JWT_DEFAULTS,
    JWT_ERRORS,
    JWT_LABELS,
    IMMUTABLE_PUBLIC_CLAIMS,
    getDefaultJWTOptions: getDefaultJWTOptions
};