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
            const domain = "contract";
            const contract = "anchoring";

            await $$.promisify(launchApiHubTestNodeWithTestDomain)();

            const generatePublicCommand = $$.promisify(contracts.generatePublicCommand);

            // create a token SSI since it doesn't required digital signing for anchoring
            const tokenSSI = createTemplateKeySSI("token", "contract");
            tokenSSI.initialize("contract", undefined, undefined, "vn0", "hint");

            const anchorId = tokenSSI.getAnchorId();
            await generatePublicCommand(domain, contract, "createAnchor", [anchorId]);

            const versionsAfterCreateAnchor = await generatePublicCommand(domain, contract, "getAllVersions", [anchorId]);
            assert.true(versionsAfterCreateAnchor.length === 0);

            const hl = createHashLinkSSI("contract", "HASH");
            const hashLinkIds = {
                last: null,
                new: hl.getIdentifier(),
            };
            const digitalProof = { signature: "", publicKey: "" };
            const zkp = "";
            await generatePublicCommand(domain, contract, "appendToAnchor", [anchorId, hashLinkIds, digitalProof, zkp]);

            const versionsAfterAppendAnchor = await generatePublicCommand(domain, contract, "getAllVersions", [anchorId]);
            assert.true(versionsAfterAppendAnchor.length === 1);

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
