require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");

const { launchApiHubTestNodeWithTestDomain } = require("../utils");

assert.callback(
    "Call a safe method using the opendsu contract's generateSafeCommand",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "test";
            const method = "safe";

            await $$.promisify(launchApiHubTestNodeWithTestDomain)();

            const generateSafeCommand = $$.promisify(contracts.generateSafeCommand);

            const { optimisticResult: commandResult } = await generateSafeCommand(domain, contract, method);
            assert.equal(commandResult, "safe");

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
