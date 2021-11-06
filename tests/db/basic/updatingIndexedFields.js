require("../../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../../psknode/tests/util/tir");
const double_check = require("double-check");
const assert = double_check.assert;

const db = require("../../../db");

assert.callback("filter after update ", (testFinishCallback) => {
    double_check.createTestFolder('AddFilesBatch', async (err, folder) => {
        tir.launchApiHubTestNode(100, folder, async err => {
            if (err) {
                throw err;
            }
            let keySSIApis = require("../../../keyssi");
            let storageSSI = keySSIApis.createSeedSSI("default");

            let mydb = db.getWalletDB(storageSSI, "testDb");

            await $$.promisify(mydb.addIndex)("test", "trialNumber");
            //await $$.promisify(mydb.addIndex)("test","trialNumber");

            mydb.beginBatch();
            await $$.promisify(mydb.insertRecord)("test", "key1", {value: "1", name: "111", trialNumber: "trial1"});
            await $$.promisify(mydb.insertRecord)("test", "key2", {value: "2", name: "222", trialNumber: "trial1"});
            await $$.promisify(mydb.insertRecord)("test", "key3", {value: "3", name: "333", trialNumber: "trial2"});
            await $$.promisify(mydb.insertRecord)("test", "key4", {value: "4", name: "444", trialNumber: "trial1"});
            await $$.promisify(mydb.updateRecord)("test", "key1", {value: "5", name: "111", trialNumber: "trial1"});
            await $$.promisify(mydb.updateRecord)("test", "key2", {value: "6", name: "222", trialNumber: "trial1"});
            await $$.promisify(mydb.commitBatch)();

            let query = "trialNumber == trial1";
            //let query = undefined;
            //let query = ['__version >= 0','trialNumber == trial1'];

            let valuesFilter = await $$.promisify(mydb.filter)("test", query, 'asc', 30);
            assert.equal(valuesFilter.length, 3);
            testFinishCallback();


        })
    })
}, 2000);