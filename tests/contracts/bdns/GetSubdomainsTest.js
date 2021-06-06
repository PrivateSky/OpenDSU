require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");
const w3cDID = require("../../../w3cdid");

const { launchApiHubTestNodeWithTestDomain } = require("../utils");

assert.callback(
    "Use BDNS contract to add subdomains and get the list of added subdomains",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "bdns";
            const subdomains = ["subdomain1", "subdomain2", "subdomain3"];

            await $$.promisify(launchApiHubTestNodeWithTestDomain)();

            const signerDID = await $$.promisify(w3cDID.createIdentity)("demo", "id");

            const generateSafeCommand = $$.promisify(contracts.generateSafeCommand);
            const generateNoncedCommand = $$.promisify(contracts.generateNoncedCommand);

            await generateNoncedCommand(domain, contract, "addSubdomain", [subdomains[0]], signerDID);
            await generateNoncedCommand(domain, contract, "addSubdomain", [subdomains[1]], signerDID);
            await generateNoncedCommand(domain, contract, "addSubdomain", [subdomains[2]], signerDID);

            const loadedSubdomains = await generateSafeCommand(domain, contract, "getSubdomains");

            assert.arraysMatch(loadedSubdomains, ["subdomain1", "subdomain2", "subdomain3"]);

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
