require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");

const { launchApiHubTestNodeWithTestDomain } = require("../utils");

assert.callback(
    "CallTestContractPublicMethodTest",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "test";
            const method = "public";

            await $$.promisify(launchApiHubTestNodeWithTestDomain)();

            const generatePublicCommand = $$.promisify(contracts.generatePublicCommand);

            const commandResult = await generatePublicCommand(domain, contract, method);
            assert.equal(commandResult, "public");

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
