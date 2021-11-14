const tir = require("../../../psknode/tests/util/tir");

const openDSU = require("../index");
$$.__registerModule("opendsu", openDSU);

//load w3cdid API from "opendsu"
const w3cDID = openDSU.loadAPI("w3cdid");

const DOMAIN_CONFIG = {
    enable: ["mq"]
};

const domain = "default";

//launching apihub with a custom configuration for "default" domain; "mq" component is enabled
tir.launchConfigurableApiHubTestNode({
    domains: [{
        name: domain,
        config: DOMAIN_CONFIG
    }]
}, async err => {
    if (err) {
        throw err;
    }

    const dataToSend = "some data";

    let receiverDIDDocument;
    let senderDIDDocument;
    try {
        //create instances of NameDID_Document for sender and receiver entities
        senderDIDDocument = await $$.promisify(w3cDID.createIdentity)("name", domain, "sender");
        receiverDIDDocument = await $$.promisify(w3cDID.createIdentity)("name", domain, "receiver");
    } catch (e) {
        return console.log(e);
    }

    senderDIDDocument.sendMessage(dataToSend, receiverDIDDocument, (err) => {
        if (err) {
            throw err;
        }

        console.log("Message sent:", dataToSend);
    });
    receiverDIDDocument.readMessage((err, receivedMessage) => {
        if (err) {
            return console.log(err);
        }

        console.log("Received message:", receivedMessage);
    });
});

