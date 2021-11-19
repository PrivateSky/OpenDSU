require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const keySSISpace = openDSU.loadAPI("keyssi");
const resolver = openDSU.loadAPI("resolver");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");

assert.callback('key DID SSI test', (testFinished) => {
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
        try {
            sc = scAPI.getSecurityContext();
            const senderDIDDocument = await $$.promisify(w3cDID.createIdentity)("ssi:name", domain, "sender");
            const receiverDIDDocument = await $$.promisify(w3cDID.createIdentity)("ssi:name", domain, "receiver");
            const message = "someData";
            const encryptedMessage = await $$.promisify(senderDIDDocument.encryptMessage)(receiverDIDDocument, message);
            const decryptedMessage = await $$.promisify(receiverDIDDocument.decryptMessage)(encryptedMessage);
            assert.equal(message, decryptedMessage, `Decrypted message is not the same as the original message`);
        } catch (e) {
            return console.log(e);
        }

        testFinished();
    });
}, 50000);

