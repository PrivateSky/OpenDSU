require("../../../../psknode/bundles/testsRuntime");
const assert = require("double-check").assert;

const db = require("../../db");


assert.callback("Filter test", (callback) => {
    let strategy = db.getBigFileStorageStrategy();
    let mydb = db.getBasicDB(strategy);
    mydb.insertRecord("test", "key1", {value:"v1"});
    mydb.insertRecord("test", "key2", {value:"v1",selected:true});
    mydb.updateRecord("test", "key1", {value:"v2", selected:true});
    mydb.updateRecord("test", "key1", {value:"v3", selected:true});
    mydb.insertRecord("test", "key3", {value:"v3",selected:false});

    function filterFunction(record){
        if(record.selected){
            return true;
        }
        return false;
    }
    mydb.filter("test", filterFunction, function(err,res){
        console.log(res);
        res.forEach(res =>{
            if(res.__key == "key2"){
                assert.equal(res.value, 'v1');
            } else {
                if(res.__key == "key1"){
                    assert.equal(res.value, 'v3');
                } else {
                    assert.fail("Unexpected value");
                }
            }
        })

        callback();
    })
});