require("../../../../psknode/bundles/testsRuntime");

const tir = require("../../../../psknode/tests/util/tir");
const dc = require("double-check");
const assert = dc.assert;

const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const w3cDID = openDSU.loadAPI("w3cdid");
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

assert.callback('w3cDID Group test', (testFinished) => {
    tir.launchVirtualMQNode(async (err, port) => {
        if (err) {
            throw err;
        }

        const domain = "default";
        const resolver = openDSU.loadAPI("resolver");
        const sc = openDSU.loadAPI("sc");

        const seedDSU = await $$.promisify(resolver.createSeedDSU)(domain);
        const seedSSI = await $$.promisify(seedDSU.getKeySSIAsObject)();

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

}, 1500000000);

