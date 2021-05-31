require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");

const { launchApiHubTestNodeWithTestDomain } = require("../utils");

assert.callback(
    "CallTestContractRequireNonceMethodUsingPublicEndpointTest",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "test";
            const method = "requireNonce";

            await $$.promisify(launchApiHubTestNodeWithTestDomain)();

            const generatePublicCommand = $$.promisify(contracts.generatePublicCommand);

            try {
                await generatePublicCommand(domain, contract, method);
                assert.true(false, "shouldn't be able to call requireNonce method via public endpoint");
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
