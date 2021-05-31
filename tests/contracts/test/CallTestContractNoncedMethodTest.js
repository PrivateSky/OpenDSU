require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");
const w3cDID = require("../../../w3cdid");

const { launchApiHubTestNodeWithTestDomain } = require("../utils");

assert.callback(
    "Call a nonced method multiple times using the opendsu contract's generateNoncedCommand",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "test";
            const method = "nonced";

            await $$.promisify(launchApiHubTestNodeWithTestDomain)();

            const signerDID = await $$.promisify(w3cDID.createIdentity)("demo", "id");

            const generateNoncedCommand = $$.promisify(contracts.generateNoncedCommand);

            const result = await generateNoncedCommand(domain, contract, method, signerDID);
            assert.equal(result, "nonced");

            const result2 = await generateNoncedCommand(domain, contract, method, signerDID);
            assert.equal(result2, "nonced");

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
