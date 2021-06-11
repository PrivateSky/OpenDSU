require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const keySSI = openDSU.loadAPI("keyssi");
const resolver = openDSU.loadAPI("resolver");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");

assert.callback('key DID SSI test', (testFinished) => {
    const domain = 'default';
    let sc;

    dc.createTestFolder('createDSU', (err, folder) => {
        tir.launchApiHubTestNode(10, folder, async (err) => {
            if (err) {
                throw err;
            }
            const initializeSC = async () => {
                try {
                    const seedDSU = await $$.promisify(resolver.createSeedDSU)(domain);
                    const seedSSI = await $$.promisify(seedDSU.getKeySSIAsObject)()
                    sc = scAPI.getSecurityContext(seedSSI);
                } catch (e) {
                    throw e;
                }
            }

            try {
                await initializeSC();
                const seedSSI = await $$.promisify(keySSI.createSeedSSI)(domain);
                const didDocument = await $$.promisify(w3cDID.createIdentity)("sread", seedSSI);

                const dataToSign = "someData";
                const signature = await $$.promisify(didDocument.sign)(dataToSign);
                const resolvedDIDDocument = await $$.promisify(w3cDID.resolveDID)(didDocument.getIdentifier());
                const verificationResult = await $$.promisify(resolvedDIDDocument.verify)(dataToSign, signature);
                assert.true(verificationResult, "Failed to verify signature");
                testFinished();
            } catch (e) {
                throw e;
            }
        });
    });
}, 50000000);

