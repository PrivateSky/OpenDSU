require("../../../../psknode/bundles/testsRuntime");
const assert = require("double-check").assert;

const db = require("../../db");


assert.callback("DB Indexing test", (callback) => {
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