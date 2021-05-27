require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const moduleConstants = require("../../../moduleConstants");
const contracts = require("../../../contracts");
const http = require("../../../http");
const w3cDID = require("../../../w3cdid");

const { launchApiHubTestNodeWithTestDomain } = require("../utils");

assert.callback(
    "CallTestContractRequireNonceMethodWithReplayAttackTest",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "test";
            const method = "requireNonce";
            await $$.promisify(launchApiHubTestNodeWithTestDomain)();

            const signerDID = await $$.promisify(w3cDID.createIdentity)("demo", "id");

            const generateRequireNonceCommand = $$.promisify(contracts.generateRequireNonceCommand);

            const result = await generateRequireNonceCommand(domain, contract, method, signerDID);
            assert.equal(result, "requireNonce");

            // call contracts endpoint with the same command
            try {
                // use the same nonce as the previous contract call
                const nonce = 1;

                const baseUrl = process.env[moduleConstants.BDNS_ROOT_HOSTS];
                const originalRequireNonceCommandUrl = `${baseUrl}/contracts/${domain}/require-nonce-command`;

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

                await $$.promisify(http.doPost)(originalRequireNonceCommandUrl, commandBody);
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
