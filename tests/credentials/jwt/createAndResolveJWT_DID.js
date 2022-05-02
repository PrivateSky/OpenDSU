require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;
const tir = require("../../../../../psknode/tests/util/tir");

const openDSU = require("../../../index");
$$.__registerModule("opendsu", openDSU);
const w3cDID = openDSU.loadAPI("w3cdid");
const scAPI = openDSU.loadAPI("sc");
const crypto = openDSU.loadApi("crypto");

const credentials = openDSU.loadApi("credentials");
const {createVc, verifyVc, jwt_getReadableIdentity, jwt_parseJWTSegments, JWT_ERRORS} = credentials;

const domain = "default";
const jwtOptions = {
    exp: 1678812494957
};

function launchApiHubAndCreateDIDs(callback) {
    dc.createTestFolder("JWT", async (err, folder) => {
        if (err) {
            return callback(err);
        }

        tir.launchApiHubTestNode(100, folder, async (err) => {
            if (err) {
                return callback(err);
            }

            scAPI.getSecurityContext().on("initialised", async () => {
                try {
                    const issuerDidDocument = await $$.promisify(w3cDID.createIdentity)("ssi:name", domain, crypto.generateRandom(20).toString("hex"));
                    const subjectDidDocument = await $$.promisify(w3cDID.createIdentity)("ssi:name", domain, crypto.generateRandom(20).toString("hex"));
                    callback(undefined, {issuerDidDocument, subjectDidDocument});
                } catch (e) {
                    callback(e);
                }
            });
        });
    });
}

assert.callback("[DID] Create and Resolve JWT success test", (callback) => {
    launchApiHubAndCreateDIDs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerDidDocument, subjectDidDocument} = result;
        jwtOptions.issuer = issuerDidDocument;
        jwtOptions.subject = subjectDidDocument;
        createVc("JWT", jwtOptions, (createJWTError, jwtInstance) => {
            if (createJWTError) {
                console.error(createJWTError);
                throw createJWTError;
            }

            const jwt = jwtInstance.getJWT();
            verifyVc("JWT", jwt, (err, resolvedJWTInstance) => {
                if (err) {
                    console.error(err);
                    throw err;
                }

                jwt_parseJWTSegments(jwt, (err, result) => {
                    if (err) {
                        console.error(err);
                        throw err;
                    }

                    const resolvedJWT = resolvedJWTInstance.getJWT();
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
}, 100000);

assert.callback("[DID] Create JWT and validate the content of the payload test", (callback) => {
    launchApiHubAndCreateDIDs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerDidDocument, subjectDidDocument} = result;
        jwtOptions.issuer = issuerDidDocument.getIdentifier();
        jwtOptions.subject = subjectDidDocument.getIdentifier();
        createVc("JWT", jwtOptions, (err, jwtInstance) => {
            if (err) {
                console.error(err);
                throw err;
            }

            const jwt = jwtInstance.getJWT();
            jwt_parseJWTSegments(jwt, (err, result) => {
                if (err) {
                    console.error(err);
                    throw err;
                }

                const {jwtPayload} = result;
                const issuer = jwt_getReadableIdentity(issuerDidDocument);
                const subject = jwt_getReadableIdentity(subjectDidDocument);
                assert.true(issuer === jwtPayload.iss, JWT_ERRORS.INVALID_ISSUER_FORMAT);
                assert.true(subject === jwtPayload.sub, JWT_ERRORS.INVALID_SUBJECT_FORMAT);

                callback();
            });
        });
    });
}, 100000);