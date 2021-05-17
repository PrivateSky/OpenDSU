require("../../../../psknode/bundles/testsRuntime");

const tir = require("../../../../psknode/tests/util/tir");
const dc = require("double-check");
const assert = dc.assert;

const w3cDID = require('../../index').loadAPI("w3cdid");
const message = "Hello DID based MQs!"
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

assert.callback('w3cDID Group test', (testFinished) => {
    tir.launchVirtualMQNode(function (err, port) {
        if (err) {
            throw err;
        }
        createIdentities((err, didDocuments) => {
            if (err) {
                throw err;
            }
            w3cDID.createIdentity("group", "myTeam", (err, groupDIDDocument) => {
                if (err) {
                    throw err;
                }

                const secondTC = new TaskCounter(() => {
                    const sender = didDocuments[0].getIdentifier();
                    setTimeout(() => {
                        groupDIDDocument.sendMessage(message, sender, (err) => {
                            if (err) {
                                throw err;
                            }
                            console.log(sender, "sent message", message);
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

