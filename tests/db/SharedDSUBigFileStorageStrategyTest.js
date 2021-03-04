require("../../../../psknode/bundles/testsRuntime");
const assert = require("double-check").assert;
const dc = require("double-check");
const db = require("../../db");
const tir = require("../../../../psknode/tests/util/tir");
const keySSIAPI = require("../../keyssi");

keySSIAPI.createSeedSSI("pharma", (err, seedSSI) => {
  const sharedDSUKeySSI = seedSSI.derive().getIdentifier()
  keySSIAPI.createSeedSSI("pharma", (err, seedSSI) => {
    const user1DSUKeySSI = seedSSI.derive().getIdentifier()
    console.log('user1DSUKeySSI', user1DSUKeySSI)
    keySSIAPI.createSeedSSI("pharma", (err, seedSSI) => {
      const user2DSUKeySSI = seedSSI.derive().getIdentifier()
      console.log('user2DSUKeySSI', user2DSUKeySSI)

      // console.log(kss, kss.getIdentifier(true))
      assert.callback("DB Indexing test", (testFinishCallback) => {
        dc.createTestFolder("wallet", function (err, folder) {
          const no_retries = 10;

          function testPersistence(sreadSSI){
            console.log("Persistence DSU is:",sreadSSI.getAnchorId());
            let mydb = db.getSharedDB(sreadSSI, "testDb");
            mydb.getRecord("test", [sharedDSUKeySSI, user1DSUKeySSI], function(err, user1DSUMetadata){
              console.log("Result for user1 is", user1DSUMetadata);
              assert.equal(user1DSUMetadata.__version, 2);
              assert.equal(user1DSUMetadata.value,"u1 v2");

              mydb.getRecord("test", [sharedDSUKeySSI, user2DSUKeySSI], function(err, user2DSUMetadata){
                console.log("Result for user2 is", user2DSUMetadata);
                assert.equal(user2DSUMetadata.__version, 1);
                assert.equal(user2DSUMetadata.value,"u2 v1");
                // they current change id is different
                assert.true(user2DSUMetadata.__changeId != user1DSUMetadata.__changeId);
                // they share the same parent
                assert.true(user2DSUMetadata.__previousRecord.__changeId === user1DSUMetadata.__previousRecord.__previousRecord.__changeId);
                testFinishCallback();
              })
            })
          }

          tir.launchApiHubTestNode(no_retries, folder, function (err, port) {
            if (err) {
              throw err;
            }

            let storageSSI = keySSIAPI.createSeedSSI("default");

            let mydb = db.getSharedDB(storageSSI, "testDb");
            mydb.insertRecord("test", sharedDSUKeySSI, {value: "original dsu change v0"});

            mydb.getRecord("test", sharedDSUKeySSI, function(err, sharedDSUMetadata){
              // user1
              mydb.insertRecord("test", [sharedDSUKeySSI, user1DSUKeySSI], sharedDSUMetadata);

              mydb.updateRecord("test", [sharedDSUKeySSI, user1DSUKeySSI], {value:"u1 v1"});
              mydb.updateRecord("test", [sharedDSUKeySSI, user1DSUKeySSI], {value:"u1 v2"});

              // user2
              mydb.insertRecord("test", [sharedDSUKeySSI, user2DSUKeySSI], sharedDSUMetadata);
              mydb.updateRecord("test", [sharedDSUKeySSI, user2DSUKeySSI], {value:"u2 v1"});

              setTimeout(function(){
                testPersistence(mydb.getShareableSSI());
              },4000);
            })
          });
        });
      }, 5000);
    })
  })
})



