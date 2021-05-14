require("../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../contracts");
const { createTemplateKeySSI } = require("../../keyssi");

const { launchApiHubTestNodeWithTestDomain } = require("./utils");

assert.callback(
    "CallContractMethodWithDefaultEnvDomainTest",
    async (testFinished) => {
        try {
            await $$.promisify(launchApiHubTestNodeWithTestDomain)({
                setConstitutionInConfig: false,
                setDefaultContractsDomainInEnv: true,
            });

            const callContractMethod = $$.promisify(contracts.callContractMethod);

            const tokenSSI = createTemplateKeySSI("token", "contract");
            const anchorId = tokenSSI.getAnchorId();

            const result = await callContractMethod("contract", "anchoring", "getAllVersions", [anchorId]);
            assert.true(result.length === 0, "Expected to have 0 versions since SSI is not anchored");

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
