require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");
const w3cDID = require("../../../w3cdid");

const { launchApiHubTestNodeWithTestDomain } = require("../utils");

assert.callback(
    "Use BDNS contract to add subdomain and read it back",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "bdns";

            await $$.promisify(launchApiHubTestNodeWithTestDomain)();

            const signerDID = await $$.promisify(w3cDID.createIdentity)("demo", "id");

            const generateSafeCommand = $$.promisify(contracts.generateSafeCommand);
            const generateNoncedCommand = $$.promisify(contracts.generateNoncedCommand);

            await generateNoncedCommand(domain, contract, "addSubdomain", ["subdomain1"], signerDID);

            const loadedSubdomainContent = await generateSafeCommand(domain, contract, "getSubdomainInfo", ["subdomain1"]);

            assert.objectHasFields(loadedSubdomainContent, {});

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
