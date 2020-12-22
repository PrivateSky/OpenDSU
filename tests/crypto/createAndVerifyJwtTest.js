require("../../../../psknode/bundles/testsRuntime");

const assert = require("double-check").assert;
const crypto = require("../../index").loadApi("crypto");
const keyssispace = require("../../index").loadApi("keyssi");
const keySSIResolver = require("key-ssi-resolver");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;
const { JWT_ERRORS } = crypto;

const templateSeedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);
templateSeedSSI.load(SSITypes.SEED_SSI, "default");

const DUMMY_IDENTIFIER = templateSeedSSI.getIdentifier(true);

const credentials = [];
const options = { subject: DUMMY_IDENTIFIER };

assert.callback("Create and verify valid JWT test", (callback) => {
    const seedSSI = keyssispace.buildSeedSSI("default");
    seedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
        if (err) throw err;

        crypto.createJWT(seedSSI, "/", credentials, options, (error, jwt) => {
            if (error) throw error;

            crypto.verifyJWT(jwt, null, (verifyError, verifyResult) => {
                if (verifyError) throw verifyError;
                assert.true(verifyResult);
                callback();
            });
        });
    });
});

assert.callback("Create and verify valid JWT and rootOfTrustVerificationStrategy success test", (callback) => {
    const seedSSI = keyssispace.buildSeedSSI("default");
    seedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
        if (err) throw err;

        crypto.createJWT(seedSSI, "/", credentials, options, (error, jwt) => {
            if (error) throw error;

            crypto.verifyJWT(
                jwt,
                (jwtContent, callback) => {
                    if (jwtContent.body.sub !== options.subject) {
                        return callback("invalid");
                    }
                    return callback(null, true);
                },
                (verifyError, verifyResult) => {
                    if (verifyError) throw verifyError;
                    assert.true(verifyResult);
                    callback();
                }
            );
        });
    });
});

assert.callback("Create and verify valid JWT and rootOfTrustVerificationStrategy failure test", (callback) => {
    const seedSSI = keyssispace.buildSeedSSI("default");
    seedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
        if (err) throw err;

        crypto.createJWT(seedSSI, "/", credentials, options, (error, jwt) => {
            if (error) throw error;

            crypto.verifyJWT(
                jwt,
                (jwtContent, callback) => {
                    if (jwtContent.body.sub === options.subject) {
                        return callback("invalid");
                    }
                    return callback(null, true);
                },
                (verifyError, verifyResult) => {
                    assert.notNull(verifyError);
                    assert.equal(verifyError, JWT_ERRORS.ROOT_OF_TRUST_VERIFICATION_FAILED);
                    callback();
                }
            );
        });
    });
});

assert.callback("Create and verify invalid JWT test", (callback) => {
    const seedSSI = keyssispace.buildSeedSSI("default");
    seedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
        if (err) throw err;

        crypto.createJWT(seedSSI, "/", credentials, options, (error, jwt) => {
            if (error) throw error;

            const invalidJwt = jwt + "invalid";
            crypto.verifyJWT(invalidJwt, null, (verifyError, verifyResult) => {
                assert.notNull(verifyError);
                assert.equal(verifyError, JWT_ERRORS.INVALID_JWT_SIGNATURE);
                callback();
            });
        });
    });
});

assert.callback("Create and verify invalid JWT (someone modifies the payload) test", (callback) => {
    const seedSSI = keyssispace.buildSeedSSI("default");
    const seedSSI2 = keyssispace.buildSeedSSI("default");

    seedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
        if (err) throw err;

        seedSSI2.initialize("default", undefined, undefined, undefined, "hint", (err) => {
            if (err) throw err;

            crypto.createJWT(seedSSI, "/", credentials, options, (error, jwt) => {
                if (error) throw error;

                crypto.createJWT(seedSSI2, "/", credentials, options, (error, jwt2) => {
                    if (error) throw error;

                    // consider the situation is which the signature is encoded correctly, but not matching
                    const firstJwtPayload = jwt.substr(0, jwt.lastIndexOf("."));
                    const secondJwtSignature = jwt2.substr(jwt.lastIndexOf(".") + 1);
                    const invalidJwt = `${firstJwtPayload}${secondJwtSignature}`;

                    crypto.verifyJWT(invalidJwt, null, (verifyError, verifyResult) => {
                        assert.notNull(verifyError);
                        callback();
                    });
                });
            });
        });
    });
});

assert.callback("createCredential test", (callback) => {
    const seedSSI = keyssispace.buildSeedSSI("default");
    seedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
        if (err) throw err;

        crypto.createCredential(seedSSI, DUMMY_IDENTIFIER, (error, jwt) => {
            if (error) throw error;

            crypto.verifyJWT(
                jwt,
                (jwtContent, callback) => {
                    if (jwtContent.body.sub !== DUMMY_IDENTIFIER) {
                        return callback("invalid");
                    }
                    return callback(null, true);
                },
                (verifyError, verifyResult) => {
                    if (verifyError) throw verifyError;
                    assert.true(verifyResult);
                    callback();
                }
            );
        });
    });
});

assert.callback("full manual verifyAuthToken test", (callback) => {
    const seedSSI = keyssispace.buildSeedSSI("default");
    const seedSSI2 = keyssispace.buildSeedSSI("default");


    seedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
        if (err) throw err;

        seedSSI2.initialize("default", undefined, undefined, undefined, "hint", (err) => {
            if (err) throw err;

            const userSReadSSI = seedSSI2.derive().getIdentifier(true);

            crypto.createCredential(seedSSI, userSReadSSI, (error, credentialJwt) => {
                if (error) throw error;

                crypto.createAuthToken(seedSSI2, "scope1", credentialJwt, (error, authToken) => {
                    if (error) throw error;

                    crypto.verifyJWT(
                        authToken,
                        (jwtContent, callback) => {
                            crypto.verifyJWT(
                                jwtContent.body.credentials[0],
                                (jwtContent, callback) => {
                                    if (userSReadSSI === jwtContent.body.sub) {
                                        return callback(null, true);
                                    }

                                    return callback(null, false);
                                },
                                (verifyError, verifyResult) => {
                                    if (verifyError) throw verifyError;
                                    assert.true(verifyResult);
                                    return callback(null, true);
                                }
                            );
                        },
                        (verifyError, verifyResult) => {
                            if (verifyError) throw verifyError;
                            assert.true(verifyResult);
                            callback();
                        }
                    );
                });
            });
        });
    });
});

assert.callback("verifyAuthToken test", (callback) => {
    const seedSSI = keyssispace.buildSeedSSI("default");
    const seedSSI2 = keyssispace.buildSeedSSI("default");


    seedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
        if (err) throw err;

        seedSSI2.initialize("default", undefined, undefined, undefined, "hint", (err) => {
            if (err) throw err;

            const organizationSReadSSI = seedSSI.derive().getIdentifier();
            const userSReadSSI = seedSSI2.derive().getIdentifier();

            crypto.createCredential(seedSSI, userSReadSSI, (error, credentialJwt) => {
                if (error) throw error;

                crypto.createAuthToken(seedSSI2, "scope1", credentialJwt, (error, authToken) => {
                    if (error) throw error;

                    crypto.verifyAuthToken(authToken, [organizationSReadSSI], (verifyError, verifyResult) => {
                        if (verifyError) throw verifyError;
                        assert.true(verifyResult);
                        return callback();
                    });
                });
            });
        });
    });
});

assert.callback("verifyAuthToken with invalid issuer test", (callback) => {
    const seedSSI = keyssispace.buildSeedSSI("default");
    const seedSSI2 = keyssispace.buildSeedSSI("default");


    seedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
        if (err) throw err;

        seedSSI2.initialize("default", undefined, undefined, undefined, "hint", (err) => {
            if (err) throw err;

            const userSReadSSI = seedSSI2.derive().getIdentifier();

            crypto.createCredential(seedSSI, userSReadSSI, (error, credentialJwt) => {
                if (error) throw error;

                crypto.createAuthToken(seedSSI2, "scope1", credentialJwt, (error, authToken) => {
                    if (error) throw error;

                    crypto.verifyAuthToken(authToken, ["INEXISTING_VERIFIER"], (verifyError, verifyResult) => {
                        assert.notNull(verifyError);
                        return callback();
                    });
                });
            });
        });
    });
});
