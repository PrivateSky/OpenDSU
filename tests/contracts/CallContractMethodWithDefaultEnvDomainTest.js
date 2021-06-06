require("../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../contracts");
const { createTemplateKeySSI } = require("../../keyssi");

const { launchApiHubTestNodeWithTestDomain } = require("./utils");

assert.callback(
    "Call contract method without having a domain config, but having set the env variable PSK_APIHUB_DEFAULT_CONTRACTS_DOMAIN_SSI",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "anchoring";

            await $$.promisify(launchApiHubTestNodeWithTestDomain)({
                setConstitutionInConfig: false,
                setDefaultContractsDomainInEnv: true,
            });

            const generateSafeCommand = $$.promisify(contracts.generateSafeCommand);

            const tokenSSI = createTemplateKeySSI("token", "contract");
            const anchorId = tokenSSI.getAnchorId();

            const { optimisticResult: result } = await generateSafeCommand(domain, contract, "getAllVersions", [anchorId]);
            assert.true(result.length === 0, "Expected to have 0 versions since SSI is not anchored");

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
