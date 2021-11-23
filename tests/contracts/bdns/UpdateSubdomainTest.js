require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const openDSU = require("../../../index");
const scAPI = openDSU.loadAPI("sc");
const contracts = openDSU.loadAPI("contracts");
const w3cDID = openDSU.loadAPI("w3cdid");
const {launchApiHubTestNodeWithContractAsync} = require("../utils");

assert.callback(
    "Use BDNS contract to add a subdomain, update the subdomain info and read it back",
    async (testFinished) => {
        const domain = "contract";
        const contract = "bdns";
        const subdomainJSON = {name: "subdomain2"};

        await launchApiHubTestNodeWithContractAsync();
        const sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            try {
                const signerDID = await $$.promisify(w3cDID.createIdentity)("demo");

                const generateSafeCommand = $$.promisify(contracts.generateSafeCommand);
                const generateNoncedCommand = $$.promisify(contracts.generateNoncedCommand);

                await generateNoncedCommand(signerDID, domain, contract, "addSubdomain", ["subdomain1"]);
                await generateNoncedCommand(signerDID, domain, contract, "updateSubdomainInfo", ["subdomain1", subdomainJSON]);

                const {optimisticResult: loadedSubdomainContent} = await generateSafeCommand(domain, contract, "getSubdomainInfo", [
                    "subdomain1",
                ]);

                assert.objectHasFields(loadedSubdomainContent, subdomainJSON);

                testFinished();
            } catch (error) {
                console.error(error);
            }
        });
    },
    20000
);
