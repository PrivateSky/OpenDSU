require("../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const tir = require("../../../../psknode/tests/util/tir");
const assert = dc.assert;


assert.callback('Get capable of signing SSI', (testfinished) => {

    dc.createTestFolder("createDSU", async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        await tir.launchConfigurableApiHubTestNodeAsync({
            domains: [{
                name: "vault",
                config: vaultDomainConfig
            }]
        });

        const domain = 'default';
        const keySSISpace = require("opendsu").loadAPI("keyssi");
        const resolver = require("opendsu").loadAPI("resolver");
        const scApi = require("opendsu").loadAPI("sc");
        const seedDSU = await $$.promisify(resolver.createSeedDSU)(domain)
        const seedSSI = await $$.promisify(seedDSU.getKeySSIAsObject)();

        const sc = scApi.getSecurityContext();
        await $$.promisify(sc.registerKeySSI)("someDID", seedSSI)
        testfinished();
    })
}, 5000000);
