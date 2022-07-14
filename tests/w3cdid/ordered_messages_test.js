require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
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
        sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            try {
                const messages = ["message1", "message2", "message3", "message4"];

                const didDocumentSender = await $$.promisify(w3cDID.createIdentity)("ssi:name", domain, "publicNameSender");
                const didDocumentReceiver = await $$.promisify(w3cDID.createIdentity)("ssi:name", domain, "publicNameReceiver");

                for (const message of messages) {
                    await $$.promisify(didDocumentSender.sendMessage)(message, didDocumentReceiver);
                }

                for (let index = 0; index < messages.length; ++index) {
                    const receivedMessage = await $$.promisify(didDocumentReceiver.readMessage)();
                    // console.log(`Messages should be the same: Original: ${messages[index]} - Received: ${receivedMessage}`)
                    assert.equal(receivedMessage, messages[index], `Messages should be the same: Original: ${messages[index]} - Received: ${receivedMessage}`);
                }

                testFinished();
            } catch (e) {
                throw e;
            }
        })
    });
}, 5000000);

