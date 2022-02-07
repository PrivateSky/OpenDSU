require('../../../../psknode/bundles/testsRuntime');
let keySSIApis = require("../../keyssi");
let anchoringApis = require("../../anchoring");
const assert = require('double-check').assert;
const dc = require("double-check");
const tir = require("../../../../psknode/tests/util/tir");
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const scAPI = openDSU.loadAPI("sc");

//todo : Revise test to use custom bdns for the fsx
assert.callback('Create anchor test', async (callback) => {

    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        const domain = 'default';
        await $$.promisify(tir.launchApiHubTestNode)(10,folder);

        const sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            let seedSSI = keySSIApis.createSeedSSI(domain);

            anchoringApis.createAnchor(seedSSI, (err, data) => {
                if (err){
                    console.log(err);
                }
                assert.true(typeof err === 'undefined');
                callback();
            })
        });
    })
}, 5000)

