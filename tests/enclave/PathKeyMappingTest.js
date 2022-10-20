require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");
const resolver = openDSU.loadAPI("resolver");
const keySSISpace = openDSU.loadAPI("keyssi");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");
const crypto = openDSU.loadAPI("crypto");

const EnclaveHandler = require("../../enclave/impl/WalletDBEnclaveHandler");
const PathKeyMapping = require("../../enclave/impl/PathKeyMapping");
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
                const NO_PATH_KEY_SSIS = 100;
                const mainEnclaveKeySSI = await $$.promisify(mainEnclave.getKeySSI)();
                const enclaveHandler = new EnclaveHandler(mainEnclaveKeySSI);
                const pathKeySSIMapping = new PathKeyMapping(enclaveHandler);
                for (let i = 0; i < NO_PATH_KEY_SSIS; i++) {
                    const path = crypto.generateRandom(16).toString("hex")
                    const pathKeySSI = await $$.promisify(keySSISpace.createPathKeySSI)("vault", `0/${path}`);
                    await $$.promisify(pathKeySSIMapping.storePathKeySSI)(pathKeySSI);
                }

                testFinished();
            });
        });
    });
}, 10000);