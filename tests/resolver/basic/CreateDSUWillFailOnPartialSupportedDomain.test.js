require("../../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require("../../../index");
$$.__registerModule("opendsu", openDSU);
const resolver = openDSU.loadAPI("resolver");
const keyssispace = openDSU.loadApi("keyssi");


assert.callback('Create DSU on partial supported domain will fail', (testfinished) => {

    dc.createTestFolder('createDSU', (err, folder) => {
        testIntegration.launchApiHubTestNode(10, folder, (err) => {
            const domain = 'default';
            prepareBDNSContext(folder);
            createDSU(domain, (err, dsu) => {
                assert.notEqual(typeof err, 'undefined', "DSU should not be created");
                assert.true(err.message.indexOf(`The provided domain <${domain}> is not configured`) !== -1, "Error message should reflect unsupported domain");

                testfinished();
            });
        })
    })
}, 5000);


function createDSU(domain, callback) {
    const keyssitemplate = keyssispace.createTemplateKeySSI('seed', domain);
    resolver.createDSU(keyssitemplate, {bricksDomain: domain}, (err, dsu) => {
        callback(err, dsu);
    });
}


function prepareBDNSContext(folder) {
    let bdns = {
        'vault': {
            "replicas": [],
            "brickStorages": [
                "$ORIGIN"
            ],
            "anchoringServices": [
                "$ORIGIN"
            ]
        },
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
