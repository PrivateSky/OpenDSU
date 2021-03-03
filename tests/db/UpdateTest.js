require("../../../../psknode/bundles/testsRuntime");
const assert = require("double-check").assert;

const db = require("../../db");


assert.callback("insert, update, get for key: string", (callback) => {
    let strategy = db.getBigFileStorageStrategy();
    let mydb = db.getBasicDB(strategy);
    mydb.insertRecord("test", "key1", {value:"1"});
    mydb.updateRecord("test", "key1", {value:2});
    mydb.getRecord("test", "key1", function(err,res){
        console.log(res);
        assert.equal(res.value,2);
        assert.equal(res.__version,1);
        assert.equal(res.__previousRecord.value,'1');
        callback();
    })
});

assert.callback("insert, update, get for key: string[]", (callback) => {
    let strategy = db.getBigFileStorageStrategy();
    let mydb = db.getBasicDB(strategy);
    mydb.insertRecord("test", ["key1", "key2", "key3"], {value: "1"});
    mydb.updateRecord("test", ["key1", "key2", "key3"], {value: 2});
    mydb.updateRecord("test", ["key1", "key2", "key3"], {value: 42});
    mydb.getRecord("test", ["key1", "key2", "key3"], function(err, res){
        console.log(res);
        assert.equal(res.value, 42);
        assert.equal(res.__version, 2);
        assert.equal(res.__previousRecord.value, 2);
        callback();
    })
});