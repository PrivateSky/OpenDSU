require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");

assert.callback('ApihubProxy test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            },
            "enable": ["enclave"]
        }
        await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: "default", config: vaultDomainConfig}]});
        const apihubProxy = enclaveAPI.initialiseAPIHUBProxy("default");
        const TABLE = "test_table";
        const addedRecord = {data: 1};
        apihubProxy.on("initialised", async () => {
            try {
                await $$.promisify(apihubProxy.insertRecord)("some_did", TABLE, "pk1", addedRecord, addedRecord);
                const record = await $$.promisify(apihubProxy.getRecord)("some_did", TABLE, "pk1");
                const enclaveDID = await $$.promisify(apihubProxy.getDID)();
                assert.objectsAreEqual(record, addedRecord, "Records do not match");

                await $$.promisify(apihubProxy.writeKey)("someDID", "key", "value");
                const value = await $$.promisify(apihubProxy.readKey)("someDID", "key");
                assert.equal(value, "value", "Values do not match");
                testFinished();
            } catch (e) {
                return console.log(e);
            }
        });
    });
}, 2000000);

