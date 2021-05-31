require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");

const { launchApiHubTestNodeWithTestDomain } = require("../utils");

assert.callback(
    "Call a nonced method using the opendsu contract's generateSafeCommand without specifying a nonce nor signature",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "test";
            const method = "nonced";

            await $$.promisify(launchApiHubTestNodeWithTestDomain)();

            const generateNoncedCommand = $$.promisify(contracts.generateNoncedCommand);

            try {
                await generateNoncedCommand(domain, contract, method);
                assert.true(false, "shouldn't be able to call nonced method without nonce/signature");
            } catch (error) {
                console.log(error);
                assert.notNull(error);
            }

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
