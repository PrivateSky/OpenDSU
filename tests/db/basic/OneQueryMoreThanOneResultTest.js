require("../../../../../psknode/bundles/testsRuntime");
const assert = require("double-check").assert;
const dc = require("double-check");
const db = require("../../../db");
const tir = require("../../../../../psknode/tests/util/tir");

assert.callback("DB query test that returns more than one result", (testFinishCallback) => {
    dc.createTestFolder("wallet", function (err, folder) {
        const no_retries = 10;
        const databaseName = "queryTestDB";
        const tableName = "test";

        function testPersistence(sreadSSI, records){
            console.log("Persistence DSU is:", sreadSSI.getAnchorId());

            let mydb = db.getSharedDB(sreadSSI, databaseName);
            mydb.on("initialised", ()=>{
                console.log("Db initialised. Starting to run the filter");
                mydb.filter(tableName, "content like /abc/g", (err, res) => {
                    if(err){
                        throw err;
                    }
                    console.log("Filter result", res);
                    assert.equal(Array.isArray(res), true, "Result of the filter should be an Array");
                    assert.equal(res.length, 2, "Result array should have 2 records");
                    assert.equal(res[0].__timestamp, records[0].__timestamp, "First item from result array should be the first record inserted");

                    testFinishCallback();
                });
            });
        }

        tir.launchApiHubTestNode(no_retries, folder, function (err, port) {
            if (err) {
                throw err;
            }
            let keySSIApis = require("../../../keyssi");
            let storageSSI = keySSIApis.createSeedSSI("default");

            let mydb = db.getWalletDB(storageSSI, databaseName);
            let confirmedInsertedRecords = [];
            mydb.insertRecord(tableName, "firstRecord", {content:"abc", meta:"something"}, function(err,res){
                if(err){
                    throw err;
                }
                confirmedInsertedRecords.push(res);
                mydb.insertRecord(tableName, "secondRecord", {content:"def", meta:"different"}, function(err,res){
                    if(err){
                        throw err;
                    }
                    confirmedInsertedRecords.push(res);
                    mydb.insertRecord(tableName, "thirdRecord", {content:"abc"}, function (err, res){
                        if(err){
                            throw err;
                        }
                        confirmedInsertedRecords.push(res);
                        testPersistence(mydb.getShareableSSI(), confirmedInsertedRecords);
                    });
                });
            });
        });
    });
}, 5000);

