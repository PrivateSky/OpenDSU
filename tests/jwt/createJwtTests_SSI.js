require("../../../../psknode/bundles/testsRuntime");

const assert = require("double-check").assert;
const keySSIResolver = require("key-ssi-resolver");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;

const openDSU = require("../../index");
const keySSISpace = openDSU.loadApi("keyssi");
const jwt = openDSU.loadApi("jwt");
const {createJWT, resolveJWT, getReadableIdentity, parseJWTSegments, JWT_ERRORS} = jwt;

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

assert.callback("[SSI] Create JWT and validate the content of the payload test", (callback) => {
    initializeSeedSSIs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerSeedSSI, subjectSeedSSI} = result;
        createJWT(issuerSeedSSI, subjectSeedSSI, jwtOptions, (createJwtError, jwtInstance) => {
            if (createJwtError) {
                console.error(createJwtError);
                throw createJwtError;
            }

            const jwt = jwtInstance.getJWT();
            parseJWTSegments(jwt, (err, jwtSegments) => {
                if (err) {
                    console.error(err);
                    throw err;
                }

                const {jwtPayload} = jwtSegments;
                const issuer = getReadableIdentity(issuerSeedSSI);
                const subject = getReadableIdentity(subjectSeedSSI);
                assert.true(issuer === jwtPayload.iss, JWT_ERRORS.INVALID_ISSUER_FORMAT);
                assert.true(subject === jwtPayload.sub, JWT_ERRORS.INVALID_SUBJECT_FORMAT);

                callback();
            });
        });
    });
});

assert.callback("[SSI] Invalid Issuer format test", (callback) => {
    initializeSeedSSIs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerSeedSSI, subjectSeedSSI} = result;
        const issuer = "invalidIssuer:" + issuerSeedSSI.getIdentifier(true);
        createJWT(issuer, subjectSeedSSI, jwtOptions, (createJwtError, jwtInstance) => {
            assert.notNull(createJwtError);
            assert.equal(createJwtError, JWT_ERRORS.INVALID_ISSUER_FORMAT);
            callback();
        });
    });
});

assert.callback("[SSI] Invalid Subject format test", (callback) => {
    initializeSeedSSIs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerSeedSSI, subjectSeedSSI} = result;
        const subject = "invalidSubject:" + subjectSeedSSI.getIdentifier(true);
        createJWT(issuerSeedSSI, subject, jwtOptions, (createJwtError, jwtInstance) => {
            assert.notNull(createJwtError);
            assert.equal(createJwtError, JWT_ERRORS.INVALID_SUBJECT_FORMAT);
            callback();
        });
    });
});

assert.callback("[SSI] Create and Resolve JWT success test", (callback) => {
    initializeSeedSSIs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerSeedSSI, subjectSeedSSI} = result;
        createJWT(issuerSeedSSI, subjectSeedSSI, jwtOptions, (createJwtError, jwtInstance) => {
            if (createJwtError) {
                console.error(createJwtError);
                throw createJwtError;
            }

            const jwt = jwtInstance.getJWT();
            const jwtHeader = jwtInstance.getJwtHeader();
            const jwtPayload = jwtInstance.getJwtPayload();
            resolveJWT(jwt, (err, resolvedJwtInstance) => {
                if (err) {
                    console.error(err);
                    throw err;
                }

                const resolvedJwtHeader = resolvedJwtInstance.getJwtHeader();
                const resolvedJwtPayload = resolvedJwtInstance.getJwtPayload();
                assert.true(jwtHeader.alg === resolvedJwtHeader.alg, JWT_ERRORS.INVALID_JWT_HEADER);
                assert.true(jwtHeader.typ === resolvedJwtHeader.typ, JWT_ERRORS.INVALID_JWT_HEADER_TYPE);
                assert.true(jwtPayload.sub === resolvedJwtPayload.sub, JWT_ERRORS.INVALID_SUBJECT_FORMAT);
                assert.true(jwtPayload.iss === resolvedJwtPayload.iss, JWT_ERRORS.INVALID_ISSUER_FORMAT);

                callback();
            });
        });
    });
});

assert.callback("[SSI] Create and Resolve JWT fail test", (callback) => {
    initializeSeedSSIs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerSeedSSI, subjectSeedSSI} = result;
        createJWT(issuerSeedSSI, subjectSeedSSI, jwtOptions, (createJwtError, jwtInstance) => {
            if (createJwtError) {
                console.error(createJwtError);
                throw createJwtError;
            }

            const jwt = jwtInstance.getJWT() + "_INVALID";
            resolveJWT(jwt, (resolveJwtError, resolvedJwtInstance) => {
                assert.notNull(resolveJwtError);
                assert.equal(resolveJwtError, JWT_ERRORS.INVALID_JWT_SIGNATURE);
                callback();
            });
        });
    });
});