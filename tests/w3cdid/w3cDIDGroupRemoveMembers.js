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

assert.callback('w3cDID Group remove member test', (testFinished) => {
    tir.launchVirtualMQNode(function (err, port) {
        if (err) {
            throw err;
        }
        createIdentities((err, didDocuments) => {
            if (err) {
                throw err;
            }
            w3cDID.createIdentity("group", "default", "myTeam", (err, groupDIDDocument) => {
                if (err) {
                    throw err;
                }

                const tc = new TaskCounter(() => {
                    groupDIDDocument.removeMember(didDocuments[1].getIdentifier(), (err) => {
                        if (err) {
                            throw err;
                        }

                        groupDIDDocument.listMembersByIdentity((err, membersIDs) => {
                            if (err) {
                                throw err;
                            }

                            assert.true(membersIDs.length === 2);
                            assert.arraysMatch(membersIDs, ['did:demo:first', 'did:demo:third']);
                            testFinished();
                        });
                    });
                });

                tc.increment(didDocuments.length);
                for (let i = 0; i < didDocuments.length; i++) {
                    groupDIDDocument.addMember(didDocuments[i].getIdentifier(), (err) => {
                        if (err) {
                            throw err;
                        }

                        tc.decrement();
                    });
                }
            });
        });
    });

}, 1500000);

