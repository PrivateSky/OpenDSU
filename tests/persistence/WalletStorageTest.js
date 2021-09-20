require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");
const dc = require("double-check");
const assert = dc.assert;

assert.callback(
    "Testing insertRecord and getRecord from main enclave db",
    async (testDone) => {
        await tir.launchConfigurableApiHubTestNodeAsync();

        const env = {
            domain: "default",
        };

        const openDSU = require("opendsu");
        const resolver = openDSU.loadAPI("resolver");
        const sc = openDSU.loadAPI("sc").getSecurityContext();
        const dbAPI = openDSU.loadAPI("db");

        setTimeout(async () => {
            const testStorage = dbAPI.getMainEnclaveDB();
            const table = "test-table";
            const pk = "test-key";
            const actualRecord = {value: 12345};
            await testStorage.insertRecordAsync(table, pk, actualRecord);
            const expectedRecord = await testStorage.getRecordAsync(table, pk);
            assert.equal(expectedRecord.value, actualRecord.value);
            assert.equal(expectedRecord.pk, pk);

            testDone();
        }, 1000);
    },
    5000
);
