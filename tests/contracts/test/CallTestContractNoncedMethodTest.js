require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const openDSU = require("../../../index");
const scAPI = openDSU.loadAPI("sc");
const contracts = openDSU.loadAPI("contracts");
const w3cDID = openDSU.loadAPI("w3cdid");
const {launchApiHubTestNodeWithContractAsync} = require("../utils");

assert.callback(
    "Call a nonced method multiple times using the opendsu contract's generateNoncedCommand",
    async (testFinished) => {
        const domain = "contract";
        const contract = "test";
        const method = "nonced";

        await launchApiHubTestNodeWithContractAsync();
        let sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            try {
                const signerDID = await $$.promisify(w3cDID.createIdentity)("demo");

                const generateNoncedCommand = $$.promisify(contracts.generateNoncedCommand);

                const {optimisticResult: result} = await generateNoncedCommand(signerDID, domain, contract, method);
                assert.equal(result, "nonced");

                const {optimisticResult: result2} = await generateNoncedCommand(signerDID, domain, contract, method);
                assert.equal(result2, "nonced");

                testFinished();
            } catch (error) {
                console.error(error);
            }
        });
    },
    20000
);
