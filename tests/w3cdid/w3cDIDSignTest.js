require("../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const w3cDID = require("../../w3cdid");

assert.callback(
    "w3cDIDSignTest",
    async (testFinished) => {
        const didDocument = await $$.promisify(w3cDID.createIdentity)("demo", "id");

        const resolvedDidDocument = await $$.promisify(w3cDID.resolveDID)(didDocument.getIdentifier());

        assert.equal(didDocument.getIdentifier(), resolvedDidDocument.getIdentifier());

        const hash = "hash";
        const signature = didDocument.sign(hash);

        const isValidSignature = await $$.promisify(didDocument.verify)(hash, signature);
        assert.true(isValidSignature);

        testFinished();
    },
    5000
);
