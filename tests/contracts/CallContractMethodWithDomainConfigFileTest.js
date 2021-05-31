require("../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../contracts");
const {  createTemplateKeySSI } = require("../../keyssi");

const { launchApiHubTestNodeWithTestDomain } = require("./utils");

assert.callback(
    "CallContractMethodWithDomainConfigFileTest",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "anchoring";

            await $$.promisify(launchApiHubTestNodeWithTestDomain)();

            const generatePublicCommand = $$.promisify(contracts.generatePublicCommand);

            const tokenSSI = createTemplateKeySSI("token", "contract");
            const anchorId = tokenSSI.getAnchorId();

            const result = await generatePublicCommand(domain, contract, "getAllVersions", [anchorId]);
            assert.true(result.length === 0, "Expected to have 0 versions since SSI is not anchored");

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
