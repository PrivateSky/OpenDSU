require("../../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require('../../../resolver');

assert.callback('Trying to create a new anchor for an existing ConstDSU', (testFinished) => {

    dc.createTestFolder('createDSU', (err, folder) => {
        testIntegration.launchApiHubTestNode(10, folder, (err) => {
            if (err) {
                throw err;
            }

            const domain = 'default';
            createDSU(domain, (err, keySSI, dsuHashLink) => {
                assert.true(typeof err !== "undefined", "Expected error when trying to create an existing DSU");
                testFinished();
            });
        })
    })
}, 5000);


function createDSU(domain, keySSICallback) {
    resolver.createArrayDSU(domain, ["username"+Date.now(), "password"],(err, dsu) => {
        if (err) {
            throw err;
        }
        dsu.writeFile("/filename", "filecontent", (err)=>{
            if(err){
                throw err;
            }
            dsu.getKeySSIAsString((err, keySSI) => {
                if (err) {
                    throw err;
                }
                resolver.createDSUForExistingSSI(keySSI, keySSICallback);
            });
        });
    });
}


