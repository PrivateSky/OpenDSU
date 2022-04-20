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
const {createVc, resolveVc, JWT_ERRORS} = credentials;

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

assert.callback("[DID] Create and Resolve JWT fail test", (callback) => {
    launchApiHubAndCreateDIDs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerDidDocument, subjectDidDocument} = result;
        jwtOptions.issuer = issuerDidDocument;
        jwtOptions.subject = subjectDidDocument;
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
}, 100000);