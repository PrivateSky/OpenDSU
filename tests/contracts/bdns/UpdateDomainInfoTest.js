require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");
const w3cDID = require("../../../w3cdid");

const { launchApiHubTestNodeWithContractAsync } = require("../utils");

assert.callback(
    "Use BDNS contract to update domain info and read it back",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "bdns";
            const domainConfigToUpdate = {
                replicas: [],
                notifications: ["http://localhost"],
                brickStorages: ["http://localhost"],
                anchoringServices: ["http://localhost"],
                contractServices: ["http://localhost"],
            };

            await launchApiHubTestNodeWithContractAsync();

            const signerDID = await $$.promisify(w3cDID.createIdentity)("demo", "id");

            const generateSafeCommand = $$.promisify(contracts.generateSafeCommand);
            const generateNoncedCommand = $$.promisify(contracts.generateNoncedCommand);

            await generateNoncedCommand(signerDID, domain, contract, "updateDomainInfo", [domainConfigToUpdate]);

            const { optimisticResult: domainInfo } = await generateSafeCommand(domain, contract, "getDomainInfo");

            // since the property values are arrays, neiter assert.objectHasFields nor assert.arraysMatch does a deep comparison
            assert.equal(JSON.stringify(domainInfo), JSON.stringify(domainConfigToUpdate));

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
