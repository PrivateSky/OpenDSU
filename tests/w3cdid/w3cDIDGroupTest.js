require("../../../../psknode/bundles/testsRuntime");

const tir = require("../../../../psknode/tests/util/tir");
const dc = require("double-check");
const assert = dc.assert;

const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const w3cDID = openDSU.loadAPI("w3cdid");
const TaskCounter = require("swarmutils").TaskCounter;
const DOMAIN = "default";

async function createIdentities() {
    const ids = ["first", "second", "third"];
    const didDocuments = [];
    for (let i = 0; i < ids.length; i++) {
        let didDocument;
        try {
            didDocument = await $$.promisify(w3cDID.createIdentity)("name", DOMAIN, ids[i]);
        } catch (e) {
            throw e;
        }

        didDocuments.push(didDocument);
    }

    return didDocuments;
}


function Message(serialisation) {
    let message = {};
    if (typeof serialisation !== "undefined") {
        try {
            message = JSON.parse(serialisation);
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Invalid message serialisation ${serialisation}`, e);
        }
    }

    this.setGroup = (_teamDID) => {
        message.group = _teamDID;
    };

    this.getGroup = () => {
        return message.group;
    }


    this.setContent = (content) => {
        message.content = content;
    };

    this.getContent = () => {
        return message.content;
    };

    this.setSender = (senderDID) => {
        message.sender = senderDID
    };

    this.getSender = () => {
        return message.sender;
    };

    this.getSerialisation = () => {
        return JSON.stringify(message);
    }
}

const messageContent = "Hello DID based MQs!"

function configureDomain(rootFolder, domain) {
    const domainConfig = {
        "anchoring": {
            "type": "FS",
            "option": {
                "enableBricksLedger": false
            },
            "commands": {
                "addAnchor": "anchor"
            }
        },
        "enable": ["mq"]
    }
    const fs = require("fs");
    const path = require("path");
    const pathToConfigFolder = path.join(rootFolder, "external-volume/config");
    fs.mkdirSync(path.join(pathToConfigFolder, "domains"), {recursive: true})
    fs.writeFileSync(path.join(pathToConfigFolder, `domains/${domain}.json`), JSON.stringify(domainConfig));
    process.env.PSK_CONFIG_LOCATION = pathToConfigFolder;
}

assert.callback('w3cDID Group test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        configureDomain(folder, DOMAIN);
        tir.launchApiHubTestNode(10, folder, async (err) => {
            if (err) {
                throw err;
            }

            const resolver = openDSU.loadAPI("resolver");
            const sc = openDSU.loadAPI("sc");

            const initializeSC = async () => {
                try {
                    const seedDSU = await $$.promisify(resolver.createSeedDSU)(DOMAIN);
                    const seedSSI = await $$.promisify(seedDSU.getKeySSIAsObject)()
                    sc.getSecurityContext(seedSSI);
                } catch (e) {
                    throw e;
                }
            }
            try {
                await initializeSC();
                const didDocuments = await createIdentities();
                const groupDIDDocument = await $$.promisify(w3cDID.createIdentity)("group", DOMAIN, "myTeam");
                let counter = 0;

                function callReadMessage(didDocument) {
                    didDocument.readMessage((err, msg) => {
                        if (err) {
                            throw err;
                        }

                        assert.equal(new Message(msg).getContent(), messageContent);
                        counter++;
                        if (counter === didDocuments.length-1) {
                            testFinished();
                        }
                    });
                }

                for (let i = 0; i < didDocuments.length; i++) {
                    await $$.promisify(groupDIDDocument.addMember)(didDocuments[i].getIdentifier());
                }

                const sender = didDocuments[0].getIdentifier();
                const message = new Message();
                message.setContent(messageContent);
                message.setSender(sender)
                await $$.promisify(groupDIDDocument.sendMessage)(message);
                console.log(sender, "sent message", message.getSerialisation());

                for (let i = 0; i < didDocuments.length; i++) {
                    await callReadMessage(didDocuments[i]);
                }

            } catch (e) {
                return console.log(e);
            }

            // assert.equal(decryptedMessage.message.toString(), dataToSend, "The received message is not the same as the message sent");

        });
    });

}, 15000);

