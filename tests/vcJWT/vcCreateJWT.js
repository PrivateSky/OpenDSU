require("../../../../psknode/bundles/testsRuntime");

const assert = require("double-check").assert;
const crypto = require("../../index").loadApi("crypto");
const keyssispace = require("../../index").loadApi("keyssi");
const keySSIResolver = require("key-ssi-resolver");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;
const CryptoRegistry = keySSIResolver.CryptoAlgorithmsRegistry;
const {vc_createJWT, vc_parseJWTSegments, vc_JWT_ERRORS} = crypto;

const templateSeedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);
templateSeedSSI.load(SSITypes.SEED_SSI, "default");

const DUMMY_IDENTIFIER = templateSeedSSI.getIdentifier(true);

assert.callback("Create SSI JWT test", (callback) => {
    const issuer = "ssi:sread:name:default:issuer";
    const subject = "ssi:sread:name:default:subject";
    const jwtOptions = {
        exp: 1678812494957
    };

    vc_createJWT(issuer, subject, jwtOptions, (err, jwt) => {
        if (err) {
            console.error(err);
            throw err;
        }

        vc_parseJWTSegments(jwt, (err, jwtSegments) => {
            if (err) {
                console.error(err);
                throw err;
            }

            const {header, payload, signature} = jwtSegments(jwt);
            console.log(header, payload, signature);

            assert.true(issuer === payload.iss, vc_JWT_ERRORS.INVALID_ISSUER_FORMAT);
            assert.true(subject === payload.sub, vc_JWT_ERRORS.INVALID_SUBJECT_FORMAT);

            callback();
        });
    });
});

/*

assert.callback("Create DID JWT test", (callback) => {
    const issuer = "did:ssi:name:default:issuer";
    const subject = "did:ssi:name:default:subject";
    const jwtOptions = {
        exp: 1678812494957
    };

    vc_createJWT(issuer, subject, jwtOptions, (err, jwt) => {
        if (err) {
            console.error(err);
            throw err;
        }

        vc_parseJWTSegments(jwt, (err, jwtSegments) => {
            if (err) {
                console.error(err);
                throw err;
            }

            const {header, payload, signature} = jwtSegments(jwt);
            console.log(header, payload, signature);

            assert.true(issuer === payload.iss, vc_JWT_ERRORS.INVALID_ISSUER_FORMAT);
            assert.true(subject === payload.sub, vc_JWT_ERRORS.INVALID_SUBJECT_FORMAT);

            callback();
        });
    });
});

assert.callback("Create JWT test invalid ISSUER", (callback) => {
    const issuer = "fail_did:ssi:name:default:issuer";
    const subject = "did:ssi:name:default:subject";
    const jwtOptions = {
        exp: 1678812494957
    };

    vc_createJWT(issuer, subject, jwtOptions, (err) => {
        assert.true(err === vc_JWT_ERRORS.INVALID_ISSUER_FORMAT);
        callback();
    });
});

assert.callback("Create JWT test invalid SUBJECT", (callback) => {
    const issuer = "did:ssi:name:default:issuer";
    const subject = "fail_did:ssi:name:default:subject";
    const jwtOptions = {
        exp: 1678812494957
    };

    vc_createJWT(issuer, subject, jwtOptions, (err) => {
        assert.true(err === vc_JWT_ERRORS.INVALID_SUBJECT_FORMAT);
        callback();
    });
});


 */