require("../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require('../../resolver');
const keyssispace = require("../../index").loadApi("keyssi");


assert.callback('The creation of DSU with existing SSI and not defined domain will fail', (testfinished) => {

    dc.createTestFolder('createDSU',(err,folder) => {
        testIntegration.launchApiHubTestNode(10, folder, (err) => {
            const domain = undefined;
            const seedSSI = keyssispace.buildTemplateSeedSSI(domain);

            seedSSI.initialize(domain, undefined, undefined, undefined, "hint", (err) => {
                if (err) {
                    throw err;
                }
                createdsuexisiting(seedSSI,  (err, dsu) => {
                    printOpenDSUError(err);
                    assert.notEqual(typeof err,'undefined');
                    testfinished()
                });
            });

        })
    })
},5000);


function createdsuexisiting(ssi, callback)
{
    resolver.createDSUForExistingSSI(ssi, (err, dsu) => {
        callback(err, dsu)
    });
}







