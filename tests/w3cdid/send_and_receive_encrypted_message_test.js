require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require("../../index");
$$.__registerModule("opendsu", openDSU);
const keySSI = openDSU.loadAPI("keyssi");
const resolver = openDSU.loadAPI("resolver");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");

const DOMAIN_CONFIG = {
    anchoring: {
        type: "FS",
        option: {
            enableBricksLedger: false,
        },
        commands: {
            addAnchor: "anchor",
        },
    },
    enable: ["mq"],
};

assert.callback(
    "key DID SSI test",
    (testFinished) => {
        const domain = "default";
        let sc;

        dc.createTestFolder("createDSU", async (err, folder) => {
            await tir.launchConfigurableApiHubTestNodeAsync({
                maxTries: 10,
                storageFolder: folder,
                domains: [
                    {
                        name: domain,
                        config: DOMAIN_CONFIG,
                    },
                ],
            });

            const initializeSC = async () => {
                try {
                    const seedDSU = await $$.promisify(resolver.createSeedDSU)(domain);
                    const seedSSI = await $$.promisify(seedDSU.getKeySSIAsObject)();
                    sc = scAPI.getSecurityContext(seedSSI);
                } catch (e) {
                    throw e;
                }
            };

            const dataToSend = "someData";

            let receiverDIDDocument;
            let senderDIDDocument;
            try {
                await initializeSC();
                senderDIDDocument = await $$.promisify(w3cDID.createIdentity)("name", domain, "sender");
                receiverDIDDocument = await $$.promisify(w3cDID.createIdentity)("name", domain, "receiver");

                const resolvedDIDDocument = await $$.promisify(w3cDID.resolveDID)(receiverDIDDocument.getIdentifier());
            } catch (e) {
                return console.log(e);
            }

            senderDIDDocument.sendMessage(dataToSend, receiverDIDDocument, (err) => {
                console.log("Sent message", dataToSend);
                receiverDIDDocument.readMessage((err, decryptedMessage) => {
                    if (err) {
                        return console.log(err);
                    }

                    assert.equal(decryptedMessage, dataToSend, "The received message is not the same as the message sent");
                    testFinished();
                });
            });
        });
    },
    10000
);
