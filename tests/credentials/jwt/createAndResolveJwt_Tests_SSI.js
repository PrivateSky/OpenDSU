require("../../../../../psknode/bundles/testsRuntime");

const assert = require("double-check").assert;
const keySSIResolver = require("key-ssi-resolver");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;

const openDSU = require("../../../index");
const keySSISpace = openDSU.loadApi("keyssi");
const credentials = openDSU.loadApi("credentials");
const {createVc, resolveVc, jwt_parseJWTSegments, JWT_ERRORS} = credentials;

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

assert.callback("[SSI] Create and Resolve JWT success test", (callback) => {
    initializeSeedSSIs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerSeedSSI, subjectSeedSSI} = result;
        jwtOptions.issuer = issuerSeedSSI;
        jwtOptions.subject = subjectSeedSSI;
        createVc("jwt", jwtOptions, (createJwtError, jwtInstance) => {
            if (createJwtError) {
                console.error(createJwtError);
                throw createJwtError;
            }

            const jwt = jwtInstance.getJWT();
            resolveVc("jwt", jwt, (err, resolvedJwtInstance) => {
                if (err) {
                    console.error(err);
                    throw err;
                }

                jwt_parseJWTSegments(jwt, (err, result) => {
                    if (err) {
                        console.error(err);
                        throw err;
                    }

                    const resolvedJWT = resolvedJwtInstance.getJWT();
                    jwt_parseJWTSegments(resolvedJWT, (err, resolvedResult) => {
                        if (err) {
                            console.error(err);
                            throw err;
                        }

                        const {jwtHeader, jwtPayload} = result;
                        const resolvedHeader = resolvedResult.jwtHeader, resolvedPayload = resolvedResult.jwtPayload;
                        assert.true(jwtHeader.alg === resolvedHeader.alg, JWT_ERRORS.INVALID_JWT_HEADER);
                        assert.true(jwtHeader.typ === resolvedHeader.typ, JWT_ERRORS.INVALID_JWT_HEADER_TYPE);
                        assert.true(jwtPayload.sub === resolvedPayload.sub, JWT_ERRORS.INVALID_SUBJECT_FORMAT);
                        assert.true(jwtPayload.iss === resolvedPayload.iss, JWT_ERRORS.INVALID_ISSUER_FORMAT);

                        callback();
                    });
                });
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
        jwtOptions.issuer = issuerSeedSSI;
        jwtOptions.subject = subjectSeedSSI;
        createVc("jwt", jwtOptions, (createJwtError, jwtInstance) => {
            if (createJwtError) {
                console.error(createJwtError);
                throw createJwtError;
            }

            const jwt = jwtInstance.getJWT() + "_INVALID";
            resolveVc("jwt", jwt, (resolveJwtError, resolvedJwtInstance) => {
                assert.notNull(resolveJwtError);
                assert.equal(resolveJwtError, JWT_ERRORS.INVALID_JWT_SIGNATURE);
                callback();
            });
        });
    });
});

