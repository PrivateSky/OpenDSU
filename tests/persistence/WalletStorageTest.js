require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");
const dc = require("double-check");
const assert = dc.assert;

assert.callback(
    "Testing setObject, getObject, insertRecord and getRecord from WalletStorage",
    async (testDone) => {
        await tir.launchConfigurableApiHubTestNodeAsync();

        const env = {
            domain: "default"
        };

        const openDSU = require("opendsu");
        const resolver = openDSU.loadAPI("resolver");
        const sc = openDSU.loadAPI("sc");
        const persistence = openDSU.loadAPI("storage");

        // const mainDSU = await $$.promisify(resolver.createDSUx)(env.domain, "seed");
        // sc.setMainDSU(mainDSU);

        const testStorage = persistence.getWalletStorage(env.domain, "testDB");

        // {
        //   const path = "/test-path";
        //   const actualObject = { key: "value" };
        //   await testStorage.setObjectAsync(path, actualObject);
        //   const expectedObject = await testStorage.getObjectAsync(path);
        //   assert.equal(
        //     JSON.stringify(expectedObject),
        //     JSON.stringify(actualObject)
        //   );
        // }

    {
      const table = "test-table";
      const pk = "test-key";
      const actualRecord = { value: 12345 };
      await testStorage.insertRecordAsync(table, pk, actualRecord);
      const expectedRecord = await testStorage.getRecordAsync(table, pk);
      assert.equal(expectedRecord.value, actualRecord.value);
      assert.equal(expectedRecord.pk, pk);
    }

    testDone();
  }, 5000
);
