require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const openDSU = require("../../../index");
const scAPI = openDSU.loadAPI("sc");
const contracts = openDSU.loadAPI("contracts");
const w3cDID = openDSU.loadAPI("w3cdid");
const {launchApiHubTestNodeWithContractAsync} = require("../utils");

assert.callback(
    "Use BDNS contract to add subdomains and get the list of added subdomains",
    async (testFinished) => {
        const domain = "contract";
        const contract = "bdns";
        const subdomains = ["subdomain1", "subdomain2", "subdomain3"];

        await launchApiHubTestNodeWithContractAsync();
        const sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            try {
                const signerDID = await $$.promisify(w3cDID.createIdentity)("demo");

                const generateSafeCommand = $$.promisify(contracts.generateSafeCommand);
                const generateNoncedCommand = $$.promisify(contracts.generateNoncedCommand);

                await generateNoncedCommand(signerDID, domain, contract, "addSubdomain", [subdomains[0]]);
                await generateNoncedCommand(signerDID, domain, contract, "addSubdomain", [subdomains[1]]);
                await generateNoncedCommand(signerDID, domain, contract, "addSubdomain", [subdomains[2]]);

                const {optimisticResult: loadedSubdomains} = await generateSafeCommand(domain, contract, "getSubdomains");

                assert.arraysMatch(loadedSubdomains, ["subdomain1", "subdomain2", "subdomain3"]);

                testFinished();
            } catch (error) {
                console.error(error);
            }
        });
    },
    2000000
);
