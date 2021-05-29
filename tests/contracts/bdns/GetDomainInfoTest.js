require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");
const moduleConstants = require("../../../moduleConstants");

const { launchApiHubTestNodeWithTestDomain } = require("../utils");

assert.callback(
    "GetDomainInfoTest",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "bdns";

            await $$.promisify(launchApiHubTestNodeWithTestDomain)();

            const generatePublicCommand = $$.promisify(contracts.generatePublicCommand);

            const domainInfo = await generatePublicCommand(domain, contract, "getDomainInfo");

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
    10000
);
