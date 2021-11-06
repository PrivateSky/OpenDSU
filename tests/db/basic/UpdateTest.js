require("../../../../../psknode/bundles/testsRuntime");
const double_check = require("double-check");
const assert = double_check.assert;
const tir = require("../../../../../psknode/tests/util/tir");

const openDSU = require("../../../index");
$$.__registerModule("opendsu", openDSU);
const resolver = openDSU.loadAPI("resolver");
const db = openDSU.loadApi("db");


assert.callback('Create DSU on partial supported domain will fail', (testfinished) => {

    double_check.createTestFolder('AddFilesBatch', async (err, folder) => {
        tir.launchApiHubTestNode(100, folder, async err => {
            if (err) {
                throw err;
            }

            let keySSI;
            try {
                const seedDSU = await $$.promisify(resolver.createSeedDSU)("default");
                keySSI = await $$.promisify(seedDSU.getKeySSIAsObject)();
            } catch (e) {
                throw e;
            }

            let mydb = db.getWalletDB(keySSI, "myDB");
            try {
                await $$.promisify(mydb.insertRecord)("test", "key1", {value: "1"})
                await $$.promisify(mydb.updateRecord)("test", "key1", {value: 2})
            } catch (e) {
                throw e;
            }
            let res;
            try {
                res = await $$.promisify(mydb.getRecord)("test", "key1")
            } catch (e) {
                throw e;
            }

            assert.equal(res.value, 2);
            assert.equal(res.__version, 1);
            testfinished();
        })
    })
}, 5000);
