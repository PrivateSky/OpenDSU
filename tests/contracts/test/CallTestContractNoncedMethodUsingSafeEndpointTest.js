require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");

const { launchApiHubTestNodeWithContractAsync } = require("../utils");

assert.callback(
    "Call a nonced method using the opendsu contract's generateSafeCommand",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "test";
            const method = "nonced";

            await launchApiHubTestNodeWithContractAsync();

            const generateSafeCommand = $$.promisify(contracts.generateSafeCommand);

            try {
                await generateSafeCommand(domain, contract, method);
                assert.true(false, "shouldn't be able to call nonced method via safe endpoint");
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
