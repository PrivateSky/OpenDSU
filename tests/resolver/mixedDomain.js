require("../../../../psknode/bundles/testsRuntime");
const keySSIResolver = require("key-ssi-resolver");
const { BRICKS_DOMAIN_KEY } = keySSIResolver.KEYSSI_CONSTS
const dc = require("double-check");
const { assert } = dc;

const resolver = require("../../resolver");
const keySSI = require("../../keyssi");


const testIntegration = require("../../../../psknode/tests/util/tir");

const DOMAIN_1 = 'default'
const DOMAIN_2 = 'predefined'

assert.callback("Resolver DSU Creation with different domains", (testFinishCallback) => {

    (function initializeEnv() {
        dc.createTestFolder("wallet", function (err, folder) {
            testIntegration.launchApiHubTestNode(10, folder, function (err, port) {
                if (err) {
                    throw err;
                }

                createDSUWithMultipleDomains()
            });
        })
    })()


    function createDSUWithMultipleDomains() {
        const defaultTemplate = keySSI.buildTemplateKeySSIWithConfigMap({
                ssiType: 'seed',
                domain: DOMAIN_1,
                hint: `${BRICKS_DOMAIN_KEY}=${DOMAIN_2}`
            }
        )
        resolver.createDSU(defaultTemplate, (err, dsu) => {
            if (err) {
                throw err;
            }

            test(dsu)
        })
    }

    function test(dsu) {
        dsu.getLastHashLinkSSI((err, hashLinkSSI) => {
            if (err) {
                throw err;
            }

            assert.equal(hashLinkSSI.getDLDomain(), DOMAIN_2)
            testFinishCallback()
        })
    }
}, 5000);
