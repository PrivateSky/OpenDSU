require("../../../../psknode/bundles/testsRuntime");

const tir = require("../../../../psknode/tests/util/tir");
const dc = require("double-check");
const assert = dc.assert;

const w3cDID = require('../../w3cdid');
const keySSI = require("../../keyssi")
const openDSU = require("../../index");
const scAPI = openDSU.loadAPI("sc");

assert.callback('w3cDID MQ test', (testFinished) => {
    const message = "Hello DID based MQs!";
    dc.createTestFolder("createDSU", async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            },
            "enable": ["mq"]
        }
        await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: "vault", config: vaultDomainConfig}]});
        let sc = scAPI.getSecurityContext();
        sc.on("initialised", async () => {
            w3cDID.createIdentity("demo", (err, firstDIDDocument) => {
                if (err) {
                    throw err;
                }

                firstDIDDocument.readMessage((err, msg) => {
                    if (err) {
                        throw err;
                    }

                    console.log(`${recipientIdentity} received message: ${msg}`);
                    assert.equal(msg, message);
                    testFinished();
                });

                const recipientIdentity = firstDIDDocument.getIdentifier();
                w3cDID.createIdentity("demo", (err, secondDIDDocument) => {
                    if (err) {
                        throw err;
                    }

                    const senderIdentity = firstDIDDocument.getIdentifier();
                    setTimeout(() => {
                        secondDIDDocument.sendMessage(message, firstDIDDocument, (err) => {
                            if (err) {
                                throw err;
                            }
                            console.log(`${senderIdentity} sent message to ${recipientIdentity}.`);
                        });
                    }, 1000);

                });
            });
        });
    });

}, 15000000);

