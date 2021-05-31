require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const moduleConstants = require("../../../moduleConstants");
const contracts = require("../../../contracts");
const http = require("../../../http");
const w3cDID = require("../../../w3cdid");

const { launchApiHubTestNodeWithTestDomain } = require("../utils");

assert.callback(
    "Simulate a reply attack after calling a nonced method using the opendsu contract's generateNoncedCommand",
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

            // call contracts endpoint with the same command
            try {
                // use the same nonce as the previous contract call
                const nonce = 1;

                const baseUrl = process.env[moduleConstants.BDNS_ROOT_HOSTS];
                const originalNoncedCommandUrl = `${baseUrl}/contracts/${domain}/nonced-command`;

                const fieldsToHash = [domain, contract, method, nonce];
                const hash = fieldsToHash.join(".");
                const signature = signerDID.sign(hash);

                const commandBody = {
                    contract,
                    method,
                    nonce,
                    signerDID: signerDID.getIdentifier(),
                    signature,
                };

                await $$.promisify(http.doPost)(originalNoncedCommandUrl, commandBody);
                assert.true(false, "shouldn't be able to call the same contract method using the same nonce");
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
