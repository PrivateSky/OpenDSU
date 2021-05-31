require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");

const { launchApiHubTestNodeWithTestDomain } = require("../utils");

assert.callback(
    "GetContractsInfoTest",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "info";

            await $$.promisify(launchApiHubTestNodeWithTestDomain)();

            const generatePublicCommand = $$.promisify(contracts.generatePublicCommand);

            const contractsInfo = await generatePublicCommand(domain, contract, "getContracts");

            const hasContractNameAndMethods = contractsInfo.every(
                (contractInfo) => contractInfo.name && contractInfo.methods && Array.isArray(contractInfo.methods)
            );
            const hasAnchoringAndConsensusContract =
                contractsInfo.filter((contractInfo) => ["anchoring", "consensus"].includes(contractInfo.name)).length === 2;

            assert.true(contractsInfo.length !== 0);
            assert.true(hasContractNameAndMethods);
            assert.true(hasAnchoringAndConsensusContract);

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
