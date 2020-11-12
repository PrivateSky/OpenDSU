require("../../../../psknode/bundles/testsRuntime");

const assert = require("double-check").assert;
const crypto = require("../../index").loadApi("crypto");
const keyssispace = require("../../index").loadApi("keyssi");

const seedSSI = keyssispace.buildSeedSSI("default");
const seedSSI2 = keyssispace.buildSeedSSI("default");

const { JWT_ERRORS } = crypto;

const credentials = [];
const options = { sub: "johnDoe" };

assert.callback("Create and verify valid JWT test", (callback) => {
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
    seedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
        if (err) throw err;

        crypto.createJWT(seedSSI, "/", credentials, options, (error, jwt) => {
            if (error) throw error;

            crypto.verifyJWT(
                jwt,
                (jwtContent, callback) => {
                    if (jwtContent.body.sub !== options.sub) {
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
    seedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
        if (err) throw err;

        crypto.createJWT(seedSSI, "/", credentials, options, (error, jwt) => {
            if (error) throw error;

            crypto.verifyJWT(
                jwt,
                (jwtContent, callback) => {
                    if (jwtContent.body.sub === options.sub) {
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
