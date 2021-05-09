require("../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../contracts");

const { launchApiHubTestNodeWithTestDomain } = require("./utils");

assert.callback(
    "CallContractMethodWithDomainConfigFileTest",
    async (testFinished) => {
        try {
            await $$.promisify(launchApiHubTestNodeWithTestDomain)();

            const callContractMethod = $$.promisify(contracts.callContractMethod);

            const result = await callContractMethod("contract", "anchoring", "versions");
            console.log("result", result);
            
            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
