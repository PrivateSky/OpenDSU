require("../../../../psknode/bundles/testsRuntime");

const tir = require("../../../../psknode/tests/util/tir");
const dc = require("double-check");
const assert = dc.assert;

const w3cDID = require('../../index').loadAPI("w3cdid");
const TaskCounter = require("swarmutils").TaskCounter;

function createIdentities(callback) {
    const ids = ["first", "second", "third"];
    const didDocuments = [];
    const tc = new TaskCounter(() => callback(undefined, didDocuments));

    tc.increment(ids.length);
    for (let i = 0; i < ids.length; i++) {
        w3cDID.createIdentity("demo", ids[i], (err, didDocument) => {
            if (err) {
                return callback(err);
            }

            didDocuments.push(didDocument);
            tc.decrement();
        });
    }
}


function Message(content) {
    let message = {};
    if (typeof content !== "undefined") {
        try {
            message = JSON.parse(content);
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Invalid message serialisation ${content}`, e);
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

assert.callback('w3cDID Group test', (testFinished) => {
    tir.launchVirtualMQNode(async (err, port) => {
        if (err) {
            throw err;
        }

        const domain = "default";
        const keySSISpace = require("opendsu").loadAPI("keyssi");
        const sc = require("opendsu").loadAPI("sc");

        const seedSSI = await $$.promisify(keySSISpace.createSeedSSI)(domain);
        await sc.getSecurityContext(seedSSI);
        createIdentities((err, didDocuments) => {
            if (err) {
                throw err;
            }
            w3cDID.createIdentity("group", "default", "myTeam", (err, groupDIDDocument) => {
                if (err) {
                    throw err;
                }

                const secondTC = new TaskCounter(() => {
                    const sender = didDocuments[0].getIdentifier();
                    setTimeout(() => {
                        const message = new Message();
                        message.setContent(messageContent);
                        message.setSender(sender)
                        groupDIDDocument.sendMessage(message, (err) => {
                            if (err) {
                                throw err;
                            }
                            console.log(sender, "sent message", message.getSerialisation());
                        });
                    }, 1000);
                });

                secondTC.increment(didDocuments.length);
                let counter = 2;
                for (let i = 0; i < didDocuments.length; i++) {
                    groupDIDDocument.addMember(didDocuments[i].getIdentifier(), (err) => {
                        if (err) {
                            throw err;
                        }

                        secondTC.decrement();

                        didDocuments[i].readMessage((err, msg) => {
                            if (err) {
                                throw err;
                            }

                            console.log(`${didDocuments[i].getIdentifier()} received message ${msg}`);
                            counter--;
                            if (counter === 0) {
                                testFinished();
                            }
                        });
                    });
                }
            });
        });
    });

}, 15000);

