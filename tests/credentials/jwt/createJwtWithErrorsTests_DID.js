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
const {createVc, verifyVc, JWT_ERRORS} = credentials;

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

assert.callback("[DID] Invalid Issuer format test", (callback) => {
    launchApiHubAndCreateDIDs((err, result) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const {issuerDidDocument, subjectDidDocument} = result;
        jwtOptions.issuer = "invalidIssuer:" + issuerDidDocument.getIdentifier();
        jwtOptions.subject = subjectDidDocument;
        createVc("JWT", jwtOptions, (createJWTError, jwtInstance) => {
            assert.notNull(createJWTError);
            assert.equal(createJWTError, JWT_ERRORS.INVALID_ISSUER_FORMAT);
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
        jwtOptions.issuer = issuerDidDocument.getIdentifier();
        jwtOptions.subject = "invalidIssuer:" + subjectDidDocument;
        createVc("JWT", jwtOptions, (createJWTError, jwtInstance) => {
            assert.notNull(createJWTError);
            assert.equal(createJWTError, JWT_ERRORS.INVALID_SUBJECT_FORMAT);
            callback();
        });
    });
}, 100000);