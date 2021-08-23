require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const scAPI = openDSU.loadAPI("sc");
const keySSISpace = openDSU.loadAPI("keyssi");

assert.callback('Initialise security context test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: "vault", config: vaultDomainConfig}]});
        const sc = scAPI.getSecurityContext();
        const seedSSI = await $$.promisify(keySSISpace.createSeedSSI)("default");
        const alias = await $$.promisify(sc.registerKeySSI)("someDID", seedSSI);
        console.log("alias", alias);

        testFinished();
    });
}, 50000000);

