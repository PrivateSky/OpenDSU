require("../../../../../psknode/bundles/testsRuntime");
const dc = require("double-check");
const assert = dc.assert;
const db = require("../../../db");
const tir = require("../../../../../psknode/tests/util/tir");
const keySSIApis = require("../../../keyssi");
const crypto = require("../../../crypto");

require("callflow").initialise();

$$.flows.describe("PopulateDB", {
    start: function (callback) {
        this.callback = callback;
        dc.createTestFolder("createDSU", (err, folder)=>{
            if (err) {
                throw err;
            }

            tir.launchVirtualMQNode(100, folder,(err, port) => {
                let keySSIApis = require("../../../keyssi");
                let storageSSI = keySSIApis.createSeedSSI("default");
                this.db = db.getWalletDB(storageSSI, "testDb");
                this.insertRecords();
            });
        })
    },

    insertRecords: function () {
        const crypto = require("../../../crypto");
        let noRecords = 1000;
        const self = this;
        this.keys = [];
        const TaskCounter = require("swarmutils").TaskCounter;

        console.time("insert records");
        const tc = new TaskCounter(()=>{
            console.timeEnd("insert records");
            return self.getRecords();
        })

        tc.increment(noRecords);
        for (let i = 0; i < noRecords; i++) {
            const key = crypto.generateRandom(32).toString("hex");
            self.keys.push(key);

            const record = {
                value: crypto.generateRandom(32).toString("hex")
            }

            self.db.insertRecord("test", key, record, () => {
                tc.decrement();
            });
        }
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
}, 30000000);