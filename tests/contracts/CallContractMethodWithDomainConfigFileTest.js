require("../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../contracts");
const { createTemplateKeySSI } = require("../../keyssi");

const { launchApiHubTestNodeWithContractAsync } = require("./utils");

assert.callback(
    "Call contract method with the an existing domain config file that contains all relevant configuration",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "anchoring";

            await launchApiHubTestNodeWithContractAsync();

            const generateSafeCommand = $$.promisify(contracts.generateSafeCommand);

            const tokenSSI = createTemplateKeySSI("token", "contract");
            const anchorId = await $$.promisify(tokenSSI.getAnchorId)();

            const { optimisticResult: result } = await generateSafeCommand(domain, contract, "getAllVersions", [anchorId]);
            assert.true(result.length === 0, "Expected to have 0 versions since SSI is not anchored");

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    20000
);
