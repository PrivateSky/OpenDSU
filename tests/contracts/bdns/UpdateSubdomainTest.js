require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");
const w3cDID = require("../../../w3cdid");

const { launchApiHubTestNodeWithTestDomain } = require("../utils");

assert.callback(
    "Use BDNS contract to add a subdomain, update the subdomain info and read it back",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "bdns";
            const subdomainJSON = { name: "subdomain2" };

            await $$.promisify(launchApiHubTestNodeWithTestDomain)();

            const signerDID = await $$.promisify(w3cDID.createIdentity)("demo", "id");

            const generateSafeCommand = $$.promisify(contracts.generateSafeCommand);
            const generateNoncedCommand = $$.promisify(contracts.generateNoncedCommand);

            await generateNoncedCommand(signerDID, domain, contract, "addSubdomain", ["subdomain1"]);
            await generateNoncedCommand(signerDID, domain, contract, "updateSubdomainInfo", ["subdomain1", subdomainJSON]);

            const { optimisticResult: loadedSubdomainContent } = await generateSafeCommand(domain, contract, "getSubdomainInfo", [
                "subdomain1",
            ]);

            assert.objectHasFields(loadedSubdomainContent, subdomainJSON);

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
