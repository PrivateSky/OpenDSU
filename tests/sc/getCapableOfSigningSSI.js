require("../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;


assert.callback('Get capable of signing SSI', (testfinished) => {

    dc.createTestFolder('createDSU', (err, folder) => {
        testIntegration.launchApiHubTestNode(10, folder, async (err) => {
            if (err) {
                throw err;
            }

            const domain = 'default';
            const keySSISpace = require("opendsu").loadAPI("keyssi");
            const resolver = require("opendsu").loadAPI("resolver");
            const sc = require("opendsu").loadAPI("sc");
            const seedDSU = await $$.promisify(resolver.createSeedDSU)(domain)
            const seedSSI = await $$.promisify(seedDSU.getKeySSIAsObject)();

            const createSeedSSI = $$.promisify(keySSISpace.createSeedSSI);
            const ssi = await createSeedSSI(domain)
            sc.getSecurityContext(ssi);
            await $$.promisify($$.sc.registerKeySSI)(seedSSI)
            const keySSI = await $$.promisify($$.sc.getCapableOfSigningKeySSI)(seedSSI.derive())

            assert.true(keySSI.getIdentifier() === seedSSI.getIdentifier());
            testfinished();
        });
    })
}, 5000);
