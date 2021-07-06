require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");

const { launchApiHubTestNodeWithContractAsync } = require("../utils");

assert.callback(
    "Call a nonced method using the opendsu contract's generateSafeCommand without specifying a timestamp nor signature",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "test";
            const method = "nonced";

            await launchApiHubTestNodeWithContractAsync();

            const generateNoncedCommand = $$.promisify(contracts.generateNoncedCommand);

            try {
                await generateNoncedCommand(null, domain, contract, method);
                assert.true(false, "shouldn't be able to call nonced method without timestamp/signature");
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
