require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");
const w3cDID = require("../../../w3cdid");

const { launchApiHubTestNodeWithContractAsync } = require("../utils");

assert.callback(
    "Use BDNS contract to add subdomain and read it back",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "bdns";

            await launchApiHubTestNodeWithContractAsync();

            const signerDID = await $$.promisify(w3cDID.createIdentity)("demo", "id");

            const generateSafeCommand = $$.promisify(contracts.generateSafeCommand);
            const generateNoncedCommand = $$.promisify(contracts.generateNoncedCommand);

            await generateNoncedCommand(signerDID, domain, contract, "addSubdomain", ["subdomain1"]);

            const { optimisticResult: loadedSubdomainContent } = await generateSafeCommand(domain, contract, "getSubdomainInfo", [
                "subdomain1",
            ]);

            assert.objectHasFields(loadedSubdomainContent, {});

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
