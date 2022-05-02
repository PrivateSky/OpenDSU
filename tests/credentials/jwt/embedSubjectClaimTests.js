require("../../../../../psknode/bundles/testsRuntime");

const assert = require("double-check").assert;
const keySSIResolver = require("key-ssi-resolver");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;

const openDSU = require("../../../index");
const keySSISpace = openDSU.loadApi("keyssi");
const credentials = openDSU.loadApi("credentials");
const {createVc, JWT_ERRORS} = credentials;

const templateSeedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);
templateSeedSSI.load(SSITypes.SEED_SSI, "default");
const jwtOptions = {
    exp: 1678812494957
};

function initializeSeedSSIs(callback) {
    const subjectSeedSSI = keySSISpace.createTemplateSeedSSI("default");
    const issuerSeedSSI = keySSISpace.createTemplateSeedSSI("default");

    subjectSeedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
        if (err) {
            return callback(err);
        }

        issuerSeedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, {issuerSeedSSI, subjectSeedSSI});
        });
    });
}

assert.callback("Embed subject claim with success test", (callback) => {
    initializeSeedSSIs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerSeedSSI, subjectSeedSSI} = result;
        jwtOptions.issuer = issuerSeedSSI;
        jwtOptions.subject = subjectSeedSSI;
        createVc("JWT", jwtOptions, (createJWTError, jwtInstance) => {
            if (createJWTError) {
                console.error(createJWTError);
                throw createJWTError;
            }

            jwtInstance.embedCredentialSubjectClaim({
                context: "https://some.uri.test",
                type: "TestSubjectClaim",
                claims: {test: "test"}
            }, (embedClaimError, embedResult) => {
                if (embedClaimError) {
                    console.error(embedClaimError);
                    throw embedClaimError;
                }

                assert.true(embedResult);
                callback();
            });
        });
    });
});

assert.callback("Bad context - Embed subject claim with error test", (callback) => {
    initializeSeedSSIs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerSeedSSI, subjectSeedSSI} = result;
        jwtOptions.issuer = issuerSeedSSI;
        jwtOptions.subject = subjectSeedSSI;
        createVc("JWT", jwtOptions, (createJWTError, jwtInstance) => {
            if (createJWTError) {
                console.error(createJWTError);
                throw createJWTError;
            }

            jwtInstance.embedCredentialSubjectClaim({
                context: "invalid context",
                type: "TestSubjectClaim",
                claims: {test: "test"}
            }, (embedClaimError) => {
                assert.notNull(embedClaimError);
                assert.equal(embedClaimError, JWT_ERRORS.INVALID_SUBJECT_CLAIM);
                callback();
            });
        });
    });
});

assert.callback("Bad type - Embed subject claim with error test", (callback) => {
    initializeSeedSSIs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerSeedSSI, subjectSeedSSI} = result;
        jwtOptions.issuer = issuerSeedSSI;
        jwtOptions.subject = subjectSeedSSI;
        createVc("JWT", jwtOptions, (createJWTError, jwtInstance) => {
            if (createJWTError) {
                console.error(createJWTError);
                throw createJWTError;
            }

            jwtInstance.embedCredentialSubjectClaim({
                context: "https://some.uri.test",
                type: null,
                claims: {test: "test"}
            }, (embedClaimError) => {
                assert.notNull(embedClaimError);
                assert.equal(embedClaimError, JWT_ERRORS.INVALID_SUBJECT_CLAIM);
                callback();
            });
        });
    });
});

assert.callback("Bad claims - Embed subject claim with error test", (callback) => {
    initializeSeedSSIs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerSeedSSI, subjectSeedSSI} = result;
        jwtOptions.issuer = issuerSeedSSI;
        jwtOptions.subject = subjectSeedSSI;
        createVc("JWT", jwtOptions, (createJWTError, jwtInstance) => {
            if (createJWTError) {
                console.error(createJWTError);
                throw createJWTError;
            }

            jwtInstance.embedCredentialSubjectClaim({
                context: "https://some.uri.test",
                type: "TestSubjectClaim",
                claims: "invalid"
            }, (embedClaimError) => {
                assert.notNull(embedClaimError);
                assert.equal(embedClaimError, JWT_ERRORS.INVALID_SUBJECT_CLAIM);
                callback();
            });
        });
    });
});

assert.callback("Try to update subject id with error test", (callback) => {
    initializeSeedSSIs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerSeedSSI, subjectSeedSSI} = result;
        jwtOptions.issuer = issuerSeedSSI;
        jwtOptions.subject = subjectSeedSSI;
        createVc("JWT", jwtOptions, (createJWTError, jwtInstance) => {
            if (createJWTError) {
                console.error(createJWTError);
                throw createJWTError;
            }

            jwtInstance.embedCredentialSubjectClaim({
                context: "https://some.uri.test",
                type: "TestSubjectClaim",
                claims: {id: "new id"}
            }, (embedClaimError) => {
                assert.notNull(embedClaimError);
                assert.equal(embedClaimError, JWT_ERRORS.IMMUTABLE_PUBLIC_CLAIM);
                callback();
            });
        });
    });
});