require("../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;
const tir = require("../../../../psknode/tests/util/tir");

const openDSU = require("../../index");
$$.__registerModule("opendsu", openDSU);
const w3cDID = openDSU.loadAPI("w3cdid");
const scAPI = openDSU.loadAPI("sc");
const crypto = openDSU.loadApi("crypto");

const jwt = openDSU.loadApi("jwt");
const {createJWT, resolveJWT, getReadableIdentity, parseJWTSegments, JWT_ERRORS} = jwt;

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

assert.callback("[DID] Create JWT and validate the content of the payload test", (callback) => {
    launchApiHubAndCreateDIDs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerDidDocument, subjectDidDocument} = result;
        createJWT(issuerDidDocument, subjectDidDocument, jwtOptions, (err, jwtInstance) => {
            if (err) {
                console.error(err);
                throw err;
            }

            const jwt = jwtInstance.getJWT();
            parseJWTSegments(jwt, (err, jwtSegments) => {
                if (err) {
                    console.error(err);
                    throw err;
                }

                const {jwtPayload} = jwtSegments;
                const issuer = getReadableIdentity(issuerDidDocument);
                const subject = getReadableIdentity(subjectDidDocument);
                assert.true(issuer === jwtPayload.iss, JWT_ERRORS.INVALID_ISSUER_FORMAT);
                assert.true(subject === jwtPayload.sub, JWT_ERRORS.INVALID_SUBJECT_FORMAT);

                callback();
            });
        });
    });
}, 100000);

assert.callback("[DID] Invalid Issuer format test", (callback) => {
    launchApiHubAndCreateDIDs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerDidDocument, subjectDidDocument} = result;
        const issuer = "invalidIssuer:" + issuerDidDocument.getIdentifier();
        createJWT(issuer, subjectDidDocument, jwtOptions, (createJwtError, jwtInstance) => {
            assert.notNull(createJwtError);
            assert.equal(createJwtError, JWT_ERRORS.INVALID_ISSUER_FORMAT);
            callback();
        });
    });
}, 100000);

assert.callback("[DID] Invalid Subject format test", (callback) => {
    launchApiHubAndCreateDIDs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerDidDocument, subjectDidDocument} = result;
        const subject = "invalidSubject:" + subjectDidDocument.getIdentifier();
        createJWT(issuerDidDocument, subject, jwtOptions, (createJwtError, jwtInstance) => {
            assert.notNull(createJwtError);
            assert.equal(createJwtError, JWT_ERRORS.INVALID_SUBJECT_FORMAT);
            callback();
        });
    });
}, 100000);

assert.callback("[DID] Create and Resolve JWT success test", (callback) => {
    launchApiHubAndCreateDIDs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerDidDocument, subjectDidDocument} = result;
        createJWT(issuerDidDocument, subjectDidDocument, jwtOptions, (createJwtError, jwtInstance) => {
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
}, 100000);

assert.callback("[DID] Create and Resolve JWT fail test", (callback) => {
    launchApiHubAndCreateDIDs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerDidDocument, subjectDidDocument} = result;
        createJWT(issuerDidDocument, subjectDidDocument, jwtOptions, (createJwtError, jwtInstance) => {
            if (createJwtError) {
                console.error(createJwtError);
                throw createJwtError;
            }

            console.log(jwtInstance.getJWT());
            const jwt = jwtInstance.getJWT() + "_INVALID";
            resolveJWT(jwt, (resolveJwtError, resolvedJwtInstance) => {
                assert.notNull(resolveJwtError);
                assert.equal(resolveJwtError, JWT_ERRORS.INVALID_JWT_SIGNATURE);
                callback();
            });
        });
    });
}, 100000);