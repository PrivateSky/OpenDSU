/*
/data/db/table/records:[pk1, pk2, ..., pkn]
/data/db/table/index_field1
/data/db/table/index_field2
...
 */

require("../../../../psknode/bundles/testsRuntime");
const assert = require("double-check").assert;
const dc = require("double-check");
const db = require("../../db");
const tir = require("../../../../psknode/tests/util/tir");

//ow.register("opendsu", "../index.js")

assert.callback("DB filtering test", (testFinishCallback) => {
    dc.createTestFolder("wallet", function (err, folder) {
        const no_retries = 10;

        tir.launchApiHubTestNode(no_retries, folder, function (err, port) {
            if (err) {
                throw err;
            }
            let keySSIApis = require("../../keyssi");
            let storageSSI = keySSIApis.createSeedSSI("default");

            let mydb = db.getWalletDB(storageSSI, "testDb");
            mydb.insertRecord("test", "key1", {value:0}, function(err,res){
                mydb.insertRecord("test", "key2", {value:1}, function(err,res){
                    mydb.insertRecord("test", "key3", {value: 2}, (err, res) => {
                        mydb.addIndex("test", "value", (err) => {
                            console.log("Added index for value");
                            if (err) {
                                console.log(err);
                            }
                            mydb.filter("test", ["<", "value", 2], (err, res) => {
                                if (err) {
                                    throw err;
                                }

                                assert.true(res.length === 2);
                                testFinishCallback();
                            });
                        });

                    });
                });
            });
        });
    });
}, 5000);
