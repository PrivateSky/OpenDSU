require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const enclaveAPI = openDSU.loadAPI("enclave");

assert.callback('HighSecurityProxy test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            },
            "enable": ["enclave"]
        }
        await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: "default", config: vaultDomainConfig}]});
        const apihubProxy = enclaveAPI.initialiseHighSecurityProxy("default");
        const TABLE = "test_table";
        const addedRecord = {data: 1};
        const newAddedRecord = {data: 2};
        setTimeout(async () => {
            try {
                await $$.promisify(apihubProxy.insertRecord)("some_did", TABLE, "pk1", addedRecord, addedRecord);
                await $$.promisify(apihubProxy.insertRecord)("some_did", TABLE, "pk2",newAddedRecord, newAddedRecord);
                const record = await $$.promisify(apihubProxy.getRecord)("some_did", TABLE, "pk1");
                assert.objectsAreEqual(record, addedRecord, "Records do not match");
                let records = await $$.promisify(apihubProxy.filter)("some_did", TABLE);
                assert.true(records.length === 2, "Unexpected filter result");
                await $$.promisify(apihubProxy.deleteRecord)("some_did", TABLE, "pk1");
                records = await $$.promisify(apihubProxy.filter)("some_did", TABLE);
                assert.true(records.length === 1, "Expected 1 result");
            } catch (e) {
                return console.log(e);
            }

            testFinished();
        }, 1000)
    });
}, 20000);

