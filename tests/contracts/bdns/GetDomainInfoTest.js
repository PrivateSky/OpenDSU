require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");
const moduleConstants = require("../../../moduleConstants");

const { launchApiHubTestNodeWithContractAsync } = require("../utils");

assert.callback(
    "Use BDNS contract to read domain info",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "bdns";

            await launchApiHubTestNodeWithContractAsync();
            console.log('FINISHED LAUNCHIGN')

            const generateSafeCommand = $$.promisify(contracts.generateSafeCommand);

            const { optimisticResult: domainInfo } = await generateSafeCommand(domain, contract, "getDomainInfo");

            const baseUrl = process.env[moduleConstants.BDNS_ROOT_HOSTS];
            const hasContractServicesDefined =
                domainInfo && domainInfo.contractServices && domainInfo.contractServices.some((service) => service === baseUrl);

            assert.notNull(domainInfo);
            assert.true(hasContractServicesDefined);

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    20000
);
