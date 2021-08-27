require("../../../../psknode/bundles/testsRuntime");

const tir = require("../../../../psknode/tests/util/tir");
const dc = require("double-check");
const assert = dc.assert;

const openDSU = require("../../index");
$$.__registerModule("opendsu", openDSU);
const w3cDID = openDSU.loadAPI("w3cdid");
const DOMAIN = "default";
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

const info = [{email: "first email", name: "first"}, {email: "second email", name: "second"}, {
    email: "third email",
    name: "third"
}]

const identities = [];

async function createIdentities() {
    const ids = ["first", "second", "third"];
    const didDocuments = [];
    for (let i = 0; i < ids.length; i++) {
        let didDocument;
        try {
            didDocument = await $$.promisify(w3cDID.createIdentity)("name", DOMAIN, ids[i]);
            identities.push(didDocument.getIdentifier());
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
    };

    this.setContent = (content) => {
        message.content = content;
    };

    this.getContent = () => {
        return message.content;
    };

    this.setSender = (senderDID) => {
        message.sender = senderDID;
    };

    this.getSender = () => {
        return message.sender;
    };

    this.getSerialisation = () => {
        return JSON.stringify(message);
    };
}

const messageContent = "Hello DID based MQs!";

assert.callback(
    "w3cDID Group test",
    (testFinished) => {
        dc.createTestFolder("createDSU", async (err, folder) => {
            const vaultDomainConfig = {
                "anchoring": {
                    "type": "FS",
                    "option": {}
                }
            }
            await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: "vault", config: vaultDomainConfig}, {name:DOMAIN, config: DOMAIN_CONFIG}]});

            const resolver = openDSU.loadAPI("resolver");
            const sc = openDSU.loadAPI("sc");

            try {
                sc.getSecurityContext();
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
                        if (counter === didDocuments.length - 1) {
                            testFinished();
                        }
                    });
                }

                for (let i = 0; i < didDocuments.length; i++) {
                    await $$.promisify(groupDIDDocument.addMember)(
                        didDocuments[i].getIdentifier(),
                        info[i]
                    );
                }

                const sender = didDocuments[0].getIdentifier();
                const message = new Message();
                message.setContent(messageContent);
                message.setSender(sender);
                await $$.promisify(groupDIDDocument.sendMessage)(message);
                console.log(sender, "sent message", message.getSerialisation());
                try {
                    const membersIDs = await $$.promisify(groupDIDDocument.listMembersByIdentity)();
                    assert.arraysMatch(membersIDs, identities, "The retrieved info is not the same as the ids added");
                    const membersInfo = await $$.promisify(groupDIDDocument.listMembersInfo)();
                    assert.objectsAreEqual(membersInfo, info, "The retrieved info is not the same as the info added");
                } catch (e) {
                    throw e;
                }
                for (let i = 0; i < didDocuments.length; i++) {
                    await callReadMessage(didDocuments[i]);
                }
            } catch (e) {
                return console.log(e);
            }

            // assert.equal(decryptedMessage.message.toString(), dataToSend, "The received message is not the same as the message sent");
        });
    },
    15000
);
