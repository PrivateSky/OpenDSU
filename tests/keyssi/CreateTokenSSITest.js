require("../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require("../../resolver");
const keySSI = require("../../keyssi");

assert.callback(
    "CreateTokenSSITest",
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
                    const { ownershipSSI, tokenSSI } = res;

                    assert.equal(ownershipSSI.getToken(), tokenSSI.getIdentifier());
                    assert.equal(tokenSSI.getSpecificString(), "SN");

                    testFinished();
                });
            });
        });
    },
    5000
);
