require("../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;

require("../../index");
const opendsu = require('../../index');
const keyssispace = opendsu.loadApi("keyssi");
const bdns = opendsu.loadApi("bdns");


assert.callback('Setting and testing a custom bdns', (testfinished) => {

    dc.createTestFolder('setcustombdns', (err, folder) => {
        testIntegration.launchApiHubTestNode(10, folder, (err) => {
            if (err) {
                throw err;
            }
            const dlDomain = 'custom_bdns';
            const brick_address = ['address1', 'address2', 'address3']
            const anchor_address = ['address4', 'address5', 'address6']
            const replicas = 10

            const seedSSI = keyssispace.createTemplateSeedSSI(dlDomain);
            seedSSI.initialize(dlDomain, undefined, undefined, undefined, (err) => {
                if (err) {
                    throw err;
                }
                let custom_bdns = {
                    'custom_bdns': {
                        "replicas": replicas,
                        "brickStorages": [
                            brick_address
                        ],
                        "anchoringServices": [
                            anchor_address
                        ]
                    }
                };

                bdns.setBDNSHosts(custom_bdns);

                bdns.getRawInfo(dlDomain, (err, rawInfo) => {
                    if (err) {
                        throw err;
                    }
                    assert.equal(brick_address, rawInfo.brickStorages[0]);
                    assert.equal(anchor_address, rawInfo.anchoringServices[0]);
                    assert.equal(replicas, rawInfo.replicas);
                    testfinished()
                });
            });
        });
    })
}, 5000);




