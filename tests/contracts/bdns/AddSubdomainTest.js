require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const openDSU = require("../../../index");
const scAPI = openDSU.loadAPI("sc");
const contracts = openDSU.loadAPI("contracts");
const w3cDID = openDSU.loadAPI("w3cdid");
const {launchApiHubTestNodeWithContractAsync} = require("../utils");

assert.callback(
    "Use BDNS contract to add subdomain and read it back",
    async (testFinished) => {

        const domain = "contract";
        const contract = "bdns";

        await launchApiHubTestNodeWithContractAsync();
        let sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            try {
                const signerDID = await $$.promisify(w3cDID.createIdentity)("demo");


                const generateSafeCommand = $$.promisify(contracts.generateSafeCommand);
                const generateNoncedCommand = $$.promisify(contracts.generateNoncedCommand);

                await generateNoncedCommand(signerDID, domain, contract, "addSubdomain", ["subdomain1"]);

                const {optimisticResult: loadedSubdomainContent} = await generateSafeCommand(domain, contract, "getSubdomainInfo", [
                    "subdomain1",
                ]);

                assert.objectHasFields(loadedSubdomainContent, {});

                testFinished();
            } catch (error) {
                console.error(error);
            }
        });
        testFinished()
    },
    20000
);
