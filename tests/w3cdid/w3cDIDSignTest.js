require("../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const w3cDID = require("../../w3cdid");
const tir = require("../../../../psknode/tests/util/tir");

assert.callback(
    "w3cDIDSignTest",
    async (testFinished) => {
        await tir.launchConfigurableApiHubTestNodeAsync();
        const didDocument = await $$.promisify(w3cDID.createIdentity)("demo", "id");

        const resolvedDidDocument = await $$.promisify(w3cDID.resolveDID)(didDocument.getIdentifier());

        assert.equal(didDocument.getIdentifier(), resolvedDidDocument.getIdentifier());

        const hash = "hash";
        const signature = await $$.promisify(didDocument.sign)(hash);

        const isValidSignature = await $$.promisify(didDocument.verify)(hash, signature);
        assert.true(isValidSignature);

        testFinished();
    },
    5000000
);
