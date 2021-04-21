require("../../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require("../../../resolver");
const keySSI = require("../../../keyssi");
const {promisify} = require("../../../utils/promise");

assert.callback(
    "Create DSU on already configured domain",
    (testFinished) => {
        dc.createTestFolder("createDSU", (err, folder) => {
            if (err) {
                throw err;
            }

            testIntegration.launchApiHubTestNode(10, folder, (err) => {
                if (err) {
                    throw err;
                }

                const domain = "default";
                keySSI.createToken(domain, "SN", async (err, res) => {
                    const ownershipSSI = res.ownershipSSI;
                    const dsu = await promisify(resolver.createDSUForExistingSSI)(ownershipSSI);

                    await promisify(dsu.writeFile)("/fld/file1", "someData");
                    const createdDsuHashLink = await promisify(dsu.getLastHashLinkSSI)();
                    assert.equal(createdDsuHashLink.getDLDomain(), domain);

                    const loadedDsu = await promisify(resolver.loadDSU)(ownershipSSI);
                    const loadedDsuHashLink = await promisify(loadedDsu.getLastHashLinkSSI)();

                    assert.equal(createdDsuHashLink.getIdentifier(true), loadedDsuHashLink.getIdentifier(true));

                    const loadedDsuWithORead = await promisify(resolver.loadDSU)(ownershipSSI.derive());
                    const content = await promisify(loadedDsuWithORead.readFile)("/fld/file1");
                    assert.equal(content.toString(), "someData");

                    testFinished();
                });
            });
        });
    },
    500000
);
