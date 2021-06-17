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

    dc.createTestFolder('createDSU', (err, folder) => {
        tir.launchApiHubTestNode(10, folder, async (err) => {
            if (err) {
                throw err;
            }
            const initializeSC = async () => {
                try {
                    const seedDSU = await $$.promisify(resolver.createSeedDSU)(domain);
                    const seedSSI = await $$.promisify(seedDSU.getKeySSIAsObject)()
                    sc = scAPI.getSecurityContext(seedSSI);
                } catch (e) {
                    throw e;
                }
            }

            try {
                await initializeSC();
                const senderDIDDocument = await $$.promisify(w3cDID.createIdentity)("name", domain, "sender");
                const receiverDIDDocument = await $$.promisify(w3cDID.createIdentity)("name", domain, "receiver");
                const message = "someData";
                const encryptedMessage = await $$.promisify(senderDIDDocument.encryptMessage)(receiverDIDDocument, message);
                const decryptedObj = await $$.promisify(receiverDIDDocument.decryptMessage)(encryptedMessage);
                assert.equal(message, decryptedObj.message.toString(), `Decrypted message is not the same as the original message`);
                testFinished();
            } catch (e) {
                throw e;
            }
        });
    });
}, 500000);

