require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");
const { createHashLinkSSI, createTemplateKeySSI } = require("../../../keyssi");

const { launchApiHubTestNodeWithTestDomain } = require("../utils");

assert.callback(
    "CallAnchoringContractForCreateAnchorTest",
    async (testFinished) => {
        try {
            await $$.promisify(launchApiHubTestNodeWithTestDomain)();

            const callContractMethod = $$.promisify(contracts.callContractMethod);

            // create a token SSI since it doesn't required digital signing for anchoring
            const tokenSSI = createTemplateKeySSI("token", "contract");
            tokenSSI.initialize("contract", undefined, undefined, "vn0", "hint");

            const anchorId = tokenSSI.getAnchorId();
            await callContractMethod("contract", "anchoring", "createAnchor", [anchorId]);

            const versionsAfterCreateAnchor = await callContractMethod("contract", "anchoring", "getAllVersions", [
                anchorId,
            ]);
            assert.true(versionsAfterCreateAnchor.length === 0);

            const hl = createHashLinkSSI("contract", "HASH");
            const hashLinkIds = {
                last: null,
                new: hl.getIdentifier(),
            };
            const digitalProof = { signature: "", publicKey: "" };
            const zkp = "";
            await callContractMethod("contract", "anchoring", "appendToAnchor", [
                anchorId,
                hashLinkIds,
                digitalProof,
                zkp,
            ]);

            const versionsAfterAppendAnchor = await callContractMethod("contract", "anchoring", "getAllVersions", [
                anchorId,
            ]);
            assert.true(versionsAfterAppendAnchor.length === 1);

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
