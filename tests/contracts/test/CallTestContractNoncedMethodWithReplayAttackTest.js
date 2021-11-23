require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require("../../../index");
const scAPI = openDSU.loadAPI("sc");
const contracts = openDSU.loadAPI("contracts");
const w3cDID = openDSU.loadAPI("w3cdid");
const {launchApiHubTestNodeWithContractAsync} = require("../utils");

assert.callback(
    "Simulate a reply attack after calling a nonced method using the opendsu contract's generateNoncedCommand",
    async (testFinished) => {
        const domain = "contract";
        const contractName = "test";
        const methodName = "nonced";
        await launchApiHubTestNodeWithContractAsync();
        let sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            try {
                const signerDID = await $$.promisify(w3cDID.createIdentity)("demo");

                const generateNoncedCommand = $$.promisify(contracts.generateNoncedCommand);

                const timestamp = Date.now();
                const {optimisticResult: result} = await generateNoncedCommand(
                    signerDID,
                    domain,
                    contractName,
                    methodName,
                    timestamp
                );
                assert.equal(result, "nonced");

                // call contracts endpoint with the same command
                try {
                    await generateNoncedCommand(signerDID, domain, contractName, methodName, timestamp);
                    assert.true(false, "shouldn't be able to call the same contract method using the same nonce");
                } catch (error) {
                    console.log(error);
                    assert.notNull(error);
                }

                testFinished();
            } catch (error) {
                console.error(error);
            }
        });
    },
    20000
);
