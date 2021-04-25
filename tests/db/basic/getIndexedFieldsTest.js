/*
/data/db/table/records:[pk1, pk2, ..., pkn]
/data/db/table/index_field1
/data/db/table/index_field2
...
 */

require("../../../../../psknode/bundles/testsRuntime");
const assert = require("double-check").assert;
const db = require("../../../db");
const tir = require("../../../../../psknode/tests/util/tir");

require("callflow").initialise();
//ow.register("opendsu", "../index.js")

$$.flows.describe("FilterDB", {
    start: function (callback) {
        this.callback = callback;

        tir.launchVirtualMQNode((err, port) => {
            assert.true(err === null || typeof err === "undefined", "Failed to create server.");

            let keySSIApis = require("../../../keyssi");
            let storageSSI = keySSIApis.createSeedSSI("default");
            this.db = db.getWalletDB(storageSSI, "testDb");
            this.insertRecords();
        });

    },

    insertRecords: function () {
        this.db.insertRecord("test", "key1", {value: 0, text: "abc"}, (err, res) => {
            if (err) {
                throw err;
            }

            this.db.insertRecord("test", "key2", {value: 1, text: "bcde"}, (err, res) => {
                if (err) {
                    throw err;
                }

                this.db.insertRecord("test", "key3", {value: 2, text: "231254"}, (err, res) => {
                    if (err) {
                        throw err;
                    }

                    this.addIndexes();
                });
            });
        });

    },

    addIndexes: function () {
        this.db.addIndex("test", "value", (err) => {
            if (err) {
                throw err;
            }

            this.db.addIndex("test", "text", (err) => {
                if (err) {
                    throw err;
                }
                this.getIndexedFieldsList();
            });
        });
    },

    getIndexedFieldsList: function () {
        this.db.getIndexedFields("test", (err, res) => {
            if (err) {
                throw err;
            }


            assert.true(res.length === 2, `Expected to receive 2 indexed fields, but got ${res.length}`);
            res.sort();
            assert.arraysMatch(res, ["text", "value"]);
            this.callback();
        });
    }
});

assert.callback("DB filtering test", (callback) => {
    $$.flows.start("FilterDB", "start", callback);
}, 10000);