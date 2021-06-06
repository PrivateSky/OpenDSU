require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../../contracts");
const { createHashLinkSSI, createTemplateKeySSI } = require("../../../keyssi");

const { launchApiHubTestNodeWithTestDomain } = require("../utils");

assert.callback(
    "Call anchoring contract methods createAnchor and appendToAnchor and checking getAllVersions for results",
    async (testFinished) => {
        try {
            const domain = "contract";
            const contract = "anchoring";

            await $$.promisify(launchApiHubTestNodeWithTestDomain)();

            const generateSafeCommand = $$.promisify(contracts.generateSafeCommand);

            // create a token SSI since it doesn't required digital signing for anchoring
            const tokenSSI = createTemplateKeySSI("token", "contract");
            tokenSSI.initialize("contract", undefined, undefined, "vn0", "hint");

            const anchorId = tokenSSI.getAnchorId();
            await generateSafeCommand(domain, contract, "createAnchor", [anchorId]);

            const { optimisticResult: versionsAfterCreateAnchor } = await generateSafeCommand(
                domain,
                contract,
                "getAllVersions",
                [anchorId]
            );
            assert.true(versionsAfterCreateAnchor.length === 0);

            const hl = createHashLinkSSI("contract", "HASH");
            const hashLinkIds = {
                last: null,
                new: hl.getIdentifier(),
            };
            const digitalProof = { signature: "", safeKey: "" };
            const zkp = "";
            await generateSafeCommand(domain, contract, "appendToAnchor", [anchorId, hashLinkIds, digitalProof, zkp]);

            const { optimisticResult: versionsAfterAppendAnchor } = await generateSafeCommand(
                domain,
                contract,
                "getAllVersions",
                [anchorId]
            );
            assert.true(versionsAfterAppendAnchor.length === 1);

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
