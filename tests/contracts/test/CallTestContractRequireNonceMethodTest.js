require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");
const w3cDID = require("../../../w3cdid");

const { launchApiHubTestNodeWithTestDomain } = require("../utils");

assert.callback(
    "CallTestContractRequireNonceMethodTest",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "test";
            const method = "requireNonce";

            await $$.promisify(launchApiHubTestNodeWithTestDomain)();

            const signerDID = await $$.promisify(w3cDID.createIdentity)("demo", "id");

            const generateRequireNonceCommand = $$.promisify(contracts.generateRequireNonceCommand);

            const result = await generateRequireNonceCommand(domain, contract, method, signerDID);
            assert.equal(result, "requireNonce");

            const result2 = await generateRequireNonceCommand(domain, contract, method, signerDID);
            assert.equal(result2, "requireNonce");

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
