require("../../../../psknode/bundles/testsRuntime");
const assert = require("double-check").assert;

const db = require("../../db");


assert.callback("insertRecord key: string, getRecord key: string", (callback) => {
  let strategy = db.getBigFileStorageStrategy();
  let mydb = db.getBasicDB(strategy);
  mydb.insertRecord("test", "key1", {value:"1"});
  mydb.getRecord("test", "key1", function(err,res){
    assert.equal(res.value, "1");
    callback();
  })
});

assert.callback("insertRecord key: string, getRecord key: string[]", (callback) => {
  let strategy = db.getBigFileStorageStrategy();
  let mydb = db.getBasicDB(strategy);
  mydb.insertRecord("test", "key1", {value:{name: "abc"}});
  mydb.getRecord("test", ["key1", "value", "name"], function(err,res){
    assert.equal(res, "abc");
    callback();
  })
});

assert.callback("insertRecord key: string[], getRecord key: string", (callback) => {
  let strategy = db.getBigFileStorageStrategy();
  let mydb = db.getBasicDB(strategy);
  mydb.insertRecord("test", ["key1", "key2", "key3"], {value:"1"});
  mydb.getRecord("test", "key1", function(err,res){
    assert.equal(res.key2.key3.value, "1");
    callback();
  })
});

assert.callback("insertRecord key: string[], getRecord key: string[]", (callback) => {
  let strategy = db.getBigFileStorageStrategy();
  let mydb = db.getBasicDB(strategy);
  mydb.insertRecord("test", ["key1", "key2", "key3"], {value:"1"});
  mydb.getRecord("test", ["key1", "key2", "key3"], function(err,res){
    assert.equal(res.value, "1");
    callback();
  })
});
