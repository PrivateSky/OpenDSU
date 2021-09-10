require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");

assert.callback('WalletDBEnclave test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: "vault", config: vaultDomainConfig}]});
        const walletDBEnclave = enclaveAPI.initialiseWalletDBEnclave();
        const TABLE = "test_table";
        const addedRecord = {data: 1};
        try {
            await $$.promisify(walletDBEnclave.insertRecord)("some_did", TABLE, "pk1", {data: "encrypted"}, addedRecord);
            const record = await $$.promisify(walletDBEnclave.getRecord)("some_did", TABLE, "pk1");
            const enclaveDID = walletDBEnclave.getDID();
            console.log(enclaveDID)
            assert.objectsAreEqual(record, addedRecord, "Records do not match");
            testFinished();
        } catch (e) {
            return console.log(e);
        }
    });
}, 5000);

