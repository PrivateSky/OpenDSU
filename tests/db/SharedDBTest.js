require("../../../../psknode/bundles/testsRuntime");
const assert = require("double-check").assert;

const db = require("../../db");
let value = "value";

assert.callback("DB Indexing test", (callback) => {
    let keySSIApis = require("../../keyssi");
    let constants = require("../../moduleConstants");
    let writableSSI = keySSIApis.buildTemplateKeySSI(constants.KEY_SSIS.SEED_SSI,"default");

    let mydb = db.getSharedDB(writableSSI, "testDb");
    mydb.insertRecord("test", "key1", {value});
    mydb.updateRecord("test", "key1", {value});
    mydb.getRecord("test", "key1", function(err,res){
        console.log(res);
        callback();
    })
});