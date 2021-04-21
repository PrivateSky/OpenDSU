require("../../../../../psknode/bundles/testsRuntime");
const assert = require("double-check").assert;
const db = require("../../../db");
const tir = require("../../../../../psknode/tests/util/tir");

require("callflow").initialise();

$$.flows.describe("PopulateDB", {
    start: function (callback) {
        this.callback = callback;

        tir.launchVirtualMQNode((err, port) => {
            let keySSIApis = require("../../../keyssi");
            let storageSSI = keySSIApis.createSeedSSI("default");
            this.db = db.getWalletDB(storageSSI, "testDb");
            this.insertRecords();
        });

    },

    insertRecords: function () {
        const crypto = require("../../../crypto");
        let noRecords = 100000;
        const self = this;
        this.keys = [];
        console.time("insert records");

        function insertRecordsRecursively(index) {
            if (index === noRecords) {
                console.timeEnd("insert records");
                return self.getRecords();
            }
            const key = crypto.generateRandom(32).toString("hex");
            self.keys.push(key);

            const record = {
                value: crypto.generateRandom(32).toString("hex")
            }

            self.db.insertRecord("test", key, record, () => {
                insertRecordsRecursively(index + 1);
            });
        }

        insertRecordsRecursively(0);
    },

    getRecords: function () {
        const self = this;
        console.time("get records");

        function getRecordsRecursively(index) {
            if (index === self.keys.length) {
                console.timeEnd("get records");
                return self.addIndexes();
            }
            const key = self.keys[index];
            self.db.getRecord("test", key, () => {
                getRecordsRecursively(index + 1);
            });
        }

        getRecordsRecursively(0);
    },

    addIndexes: function () {
        this.db.addIndex("test", "value", (err) => {
            if (err) {
                throw err;
            }

            this.showValuesLessThan();
        });
    },

    showValuesLessThan: function () {
        let value = this.keys[this.keys.length / 2];
        console.time("query time")
        this.db.filter("test", `value <= ${value}`, "asc", 1, (err, res) => {
            if (err) {
                throw err;
            }

            console.timeEnd("query time");
            this.callback();
        });
    }
});

assert.callback("DB performance test", (callback) => {
    $$.flows.start("PopulateDB", "start", callback);
}, 3000);