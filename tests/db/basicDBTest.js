require("../../../../psknode/bundles/testsRuntime");
const assert = require("double-check").assert;

const db = require("../../db");
let value = "value";

assert.callback("DB Indexing test", (callback) => {
    let strategy = db.getBigFileStorageStrategy();
    let mydb = db.getBasicDB(strategy);
    mydb.insertRecord("test", "key1", {value});
    mydb.updateRecord("test", "key1", {value});
    mydb.getRecord("test", "key1", function(err,res){
        console.log(res);
        callback();
    })
});