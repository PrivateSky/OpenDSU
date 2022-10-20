require('../../../../psknode/bundles/testsRuntime');
const dc = require('double-check');
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const resolver = openDSU.loadAPI("resolver");
const keySSISpace = openDSU.loadAPI("keyssi");
const scAPI = openDSU.loadAPI("sc");
const configAPI = openDSU.loadAPI("config");
const w3cDID = openDSU.loadAPI("w3cdid");

const EnclaveHandler = require("../../enclave/impl/WalletDBEnclaveHandler");
const tir = require("../../../../psknode/tests/util/tir");
const constants = require("../../moduleConstants");
assert.callback('WalletDBEnclave test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: "vault", config: vaultDomainConfig}]});

        const mainEnclave = enclaveAPI.initialiseWalletDBEnclave();
        mainEnclave.on("initialised", async () => {

            await $$.promisify(scAPI.setMainEnclave)(mainEnclave);
            const sc = scAPI.refreshSecurityContext();
            sc.on("initialised", async () => {

                const pathKeySSI = await $$.promisify(keySSISpace.createPathKeySSI)("vault", "0/somePath")
                console.log(pathKeySSI.getIdentifier());
                testFinished();
            });
        });
    });
}, 100000);