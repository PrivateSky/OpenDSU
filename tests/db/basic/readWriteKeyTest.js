require("../../../../../psknode/bundles/testsRuntime");
const dc = require("double-check");
const assert = dc.assert;
const db = require("../../../db");
const tir = require("../../../../../psknode/tests/util/tir");

assert.callback("read write key test", (testFinishCallback) => {
    dc.createTestFolder("wallet", function (err, folder) {
        const no_retries = 10;

        async function testPersistence(sreadSSI) {
            console.log("Persistence DSU is:", await $$.promisify(sreadSSI.getAnchorId)());
            let mydb = db.getSharedDB(sreadSSI, "testDb");
            mydb.readKey("buffer", (err, content) => {
                assert.true(Buffer.isBuffer(content), "Expected a buffer");
                mydb.readKey("string", (err, content) => {
                    assert.true(typeof content === "string", "Expected a string");
                    mydb.readKey("undefined", (err, content) => {
                        assert.true(typeof content === "undefined", "Expected undefined");
                        mydb.readKey("null", (err, content) => {
                            assert.true( content === null, "Expected null");
                            mydb.readKey("object", (err, res) => {
                                assert.true(typeof res.content !== "undefined", "Expected an object");
                                assert.true(res.content === "some content");
                                testFinishCallback();
                            });
                        });
                    });
                });
            });
        }

        tir.launchApiHubTestNode(no_retries, folder, function (err, port) {
            if (err) {
                throw err;
            }
            let keySSIApis = require("../../../keyssi");
            let storageSSI = keySSIApis.createSeedSSI("default");

            let mydb = db.getWalletDB(storageSSI, "testDb");

            mydb.writeKey("buffer", Buffer.from("Some data"), (err) => {
                mydb.writeKey("string", "Some data", (err) => {
                    mydb.writeKey("object", {content: "some content"}, (err) => {
                        mydb.writeKey("undefined", undefined, (err) => {
                            mydb.writeKey("null", null, async (err) => {
                                await testPersistence(mydb.getShareableSSI());
                            });
                        });
                    });
                });
            });
        });
    });
}, 5000);
