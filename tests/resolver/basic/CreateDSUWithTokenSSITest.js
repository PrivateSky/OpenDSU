require("../../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require("../../../resolver");
const keySSI = require("../../../keyssi");
const { promisify } = require("../../../utils/promise");

assert.callback(
    "Create DSU on already configured domain",
    (testFinished) => {
        dc.createTestFolder("createDSU", (err, folder) => {
            if (err) {
                throw err;
            }

            testIntegration.launchApiHubTestNode(10, folder, async (err) => {
                if (err) {
                    throw err;
                }

                const domain = "default";

                let { ownershipSSI } = keySSI.createToken(domain, "SN");

                const dsu = await promisify(resolver.createDSUForExistingSSI)(ownershipSSI);
                const createdDsuHashLink = await promisify(dsu.getLastHashLinkSSI)();

                assert.equal(createdDsuHashLink.getDLDomain(), domain);

                // temporary commented out due to issue with DSUFactory's initializeKeySSI

                const loadedDsu = await promisify(resolver.loadDSU)(ownershipSSI);
                const loadedDsuHashLink = await promisify(loadedDsu.getLastHashLinkSSI)();

                assert.equal(createdDsuHashLink.getIdentifier(true), loadedDsuHashLink.getIdentifier(true));

                const loadedDsuWithORead = await promisify(resolver.loadDSU)(ownershipSSI.derive());
                const loadedDsuWithOReadHashLink = await promisify(loadedDsuWithORead.getLastHashLinkSSI)();

                assert.equal(createdDsuHashLink.getIdentifier(true), loadedDsuWithOReadHashLink.getIdentifier(true));

                testFinished();
            });
        });
    },
    5000
);
