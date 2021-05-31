require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");

const { launchApiHubTestNodeWithTestDomain } = require("../utils");

assert.callback(
    "CallTestContractRequireNonceMethodIncompleteRequestTest",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "test";
            const method = "requireNonce";

            await $$.promisify(launchApiHubTestNodeWithTestDomain)();

            const generateRequireNonceCommand = $$.promisify(contracts.generateRequireNonceCommand);

            try {
                await generateRequireNonceCommand(domain, contract, method);
                assert.true(false, "shouldn't be able to call requireNonce method without nonce/signature");
            } catch (error) {
                console.log(error);
                assert.notNull(error);
            }

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
