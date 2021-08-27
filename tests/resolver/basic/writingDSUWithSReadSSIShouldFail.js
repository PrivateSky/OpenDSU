require("../../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../../index');
$$.__registerModule("opendsu", openDSU);
const resolver = openDSU.loadAPI("resolver");

assert.callback('Writing DSU with SReadSSI via SC', (testFinished) => {
    const domain = 'default';
    let sc;

    dc.createTestFolder('createDSU', (err, folder) => {
        tir.launchApiHubTestNode(10, folder, async (err) => {
            if (err) {
                throw err;
            }
            const seedDSU = await $$.promisify(resolver.createSeedDSU)(domain);
            const seedSSI = await $$.promisify(seedDSU.getKeySSIAsString)();
            const mountedDSU = await $$.promisify(resolver.createSeedDSU)(domain);
            const mountedDSUSeedSSI = await $$.promisify(mountedDSU.getKeySSIAsObject)();
            const mountedDSUSreadSSI = mountedDSUSeedSSI.derive();
            console.log("seed SSI =====", seedSSI);
            console.log("mounted dsu SSI =====", mountedDSUSeedSSI.getIdentifier());
            console.log("mounted dsu sread SSI =====", mountedDSUSreadSSI.getIdentifier());
            await $$.promisify(seedDSU.mount)("/mountedDSU", mountedDSUSreadSSI);
            let error;
            try {
                await $$.promisify(seedDSU.writeFile)("/mountedDSU/file", "someData");
            } catch (e) {
                error = e;
            }
            // assert.true(error !== undefined);
            testFinished();
        });
    });
}, 5000);

