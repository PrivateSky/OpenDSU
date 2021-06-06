require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");

const { launchApiHubTestNodeWithTestDomain } = require("../utils");

assert.callback(
    "Use info contract to get the list of available contracts and their methods",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "info";

            await $$.promisify(launchApiHubTestNodeWithTestDomain)();

            const generateSafeCommand = $$.promisify(contracts.generateSafeCommand);

            const { optimisticResult: contractsInfo } = await generateSafeCommand(domain, contract, "getContracts");
            console.log("contractsInfo", contractsInfo);

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
