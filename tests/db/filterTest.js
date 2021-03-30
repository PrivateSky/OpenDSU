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

require("callflow").initialise();
//ow.register("opendsu", "../index.js")

$$.flows.describe("FilterDB", {
    start: function (callback) {
        this.callback = callback;

        tir.launchVirtualMQNode((err, port) => {
            assert.true(err === null || typeof err === "undefined", "Failed to create server.");

            let keySSIApis = require("../../keyssi");
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
                this.showValuesLessThan();
            });
        });
    },

    showValuesLessThan: function () {
        this.db.filter("test", ["<", "value", 2], (err, res) => {
            if (err) {
                throw err;
            }
            assert.true(res.length === 2);
            this.db.filter("test", ["<=", "value", 2], (err, res) => {
                if (err) {
                    throw err;
                }

                assert.true(res.length === 3);

                this.showValuesGreaterThan();
            });
        });
    },

    showValuesGreaterThan: function () {
        this.db.filter("test", [">", "value", 0], (err, res) => {
            if (err) {
                throw err;
            }

            assert.true(res.length === 2);
            this.db.filter("test", [">=", "value", 1], (err, res) => {
                if (err) {
                    throw err;
                }
                assert.true(res.length === 2);
                this.showValuesEqualWith();
            });
        });
    },

    showValuesEqualWith: function () {
        this.db.filter("test", ["==", "value", 1], (err, res) => {
            if (err) {
                throw err;
            }

            assert.true(res.length === 1);
            this.db.filter("test", ["like", "text", /^[A-Z]+$/i], (err, res) => {
                if (err) {
                    throw err;
                }

                assert.true(res.length === 2);
                this.callback()
            });
        });
    }
});

assert.callback("DB filtering test", (callback) => {
    $$.flows.start("FilterDB", "start", callback);
}, 3000);