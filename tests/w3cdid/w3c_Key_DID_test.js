require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");
const crypto = openDSU.loadAPI("crypto");

assert.callback('W3C Key DID test', (testFinished) => {
    const domain = 'default';
    let sc;

    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: "vault", config: vaultDomainConfig}]});
        sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            try {
                const keyPair = crypto.generateKeyPair();
                const didDocument = await $$.promisify(w3cDID.createIdentity)("key", undefined, keyPair.privateKey);

                const dataToSign = "someData";
                const signature = await $$.promisify(didDocument.sign)(dataToSign);
                const verificationResult = await $$.promisify(didDocument.verify)(dataToSign, signature);
                assert.true(verificationResult, "Failed to verify signature");
                testFinished();
            } catch (e) {
                throw e;
            }
        });
    });
}, 2000000);

