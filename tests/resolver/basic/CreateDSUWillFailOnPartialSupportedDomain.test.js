require("../../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require('../../../resolver');
const keySSI = require("../../../keyssi")


assert.callback('Create DSU on partial supported domain will fail', (testfinished) => {

    dc.createTestFolder('createDSU', (err, folder) => {
        testIntegration.launchApiHubTestNode(10, folder, (err) => {
            const domain = 'testdomain';
            prepareBDNSContext(folder);
            createDSU(domain, (err, dus) => {

                printOpenDSUError(err);
                assert.notEqual(typeof err, 'undefined');

                testfinished();
            });
        })
    })
}, 5000);


function createDSU(domain, callback) {
    const keyssitemplate = keySSI.createTemplateKeySSI('seed', domain);
    resolver.createDSU(keyssitemplate, {bricksDomain: domain}, (err, dsu) => {
        callback(err, dsu);
    });
}


function prepareBDNSContext(folder) {

    let bdns = {
        'testdomain': {
            "replicas": [],
            "brickStorages": [
                "$ORIGIN"
            ],
            "anchoringServices": [
                "$ORIGIN"
            ]
        }
    }

    require('fs').writeFileSync(folder + '/external-volume/config/bdns.hosts', JSON.stringify(bdns));

}