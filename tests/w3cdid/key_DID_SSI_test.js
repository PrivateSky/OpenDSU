require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('opendsu');
const keySSI = openDSU.loadAPI("keyssi");
const resolver = openDSU.loadAPI("resolver");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");

assert.callback('key DID SSI test', (testFinished) => {
    const domain = 'default';
    let sc;

    dc.createTestFolder('createDSU', (err, folder) => {
        tir.launchApiHubTestNode(10, folder, (err) => {
            if (err) {
                throw err;
            }
            const initializeSC = (callback) => {
                resolver.createSeedDSU(domain, (err, seedDSU) => {
                    if (err) {
                        return callback(err);
                    }
                    seedDSU.getKeySSIAsObject((err, seedSSI) => {
                        if (err) {
                            return callback(err);
                        }
                        sc = scAPI.getSecurityContext(seedSSI);
                        callback()
                    });
                })
            }
            initializeSC(async (err) => {
                if (err) {
                    throw err;
                }
                try {
                    const seedSSI = await $$.promisify(keySSI.createSeedSSI)(domain);
                    const didDocument = await $$.promisify(w3cDID.createIdentity)("key", seedSSI);

                    const dataToSign = "someData";
                    const signature = await $$.promisify(didDocument.sign)(dataToSign);
                    const verificationResult = await $$.promisify(didDocument.verify)(dataToSign, signature);
                    assert.true(verificationResult, "Failed to verify signature");
                    testFinished();
                } catch (e) {
                    throw e;
                }
            });
        });
    });
}, 5000);

