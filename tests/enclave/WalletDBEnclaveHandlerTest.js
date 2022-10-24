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
const utils = require("../../enclave/impl/utils");
const EnclaveHandler = require("../../enclave/impl/WalletDBEnclaveHandler");
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
            const NO_PATH_KEY_SSIS = 30;
            const mainEnclaveKeySSI = await $$.promisify(mainEnclave.getKeySSI)();
            const enclaveHandler = new EnclaveHandler(mainEnclaveKeySSI, {maxNoScatteredKeys: 10});
            let expectedResult = {};
            for (let i = 0; i < NO_PATH_KEY_SSIS; i++) {
                const path = crypto.generateRandom(16).toString("hex")
                const pathKeySSI = keySSISpace.createPathKeySSI("vault", `0/${path}`);
                await $$.promisify(enclaveHandler.storePathKeySSI)(pathKeySSI);
                const derivedKeySSIs = await $$.promisify(utils.getAllDerivedSSIsForKeySSI)(pathKeySSI);
                expectedResult = {...expectedResult, ...derivedKeySSIs};
            }

            const loadedPaths = await $$.promisify(enclaveHandler.loadPaths)();
            assert.objectsAreEqual(expectedResult, loadedPaths);

            testFinished();
        });
    });
}, 1000000);