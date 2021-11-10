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

    let firstMember;
    let secondMember;
    let groupDID_Document;
    try {
        //create instances of NameDID_Document for sender and receiver entities
        firstMember = await $$.promisify(w3cDID.createIdentity)("name", domain, "member1");
        secondMember = await $$.promisify(w3cDID.createIdentity)("name", domain, "member2");

        //create GroupDID_Document instance
        groupDID_Document = await $$.promisify(w3cDID.createIdentity)("group", domain, "group_name");

        // add members to group
        await $$.promisify(groupDID_Document.addMember)(firstMember);
        await $$.promisify(groupDID_Document.addMember)(secondMember);
    } catch (e) {
        return console.log(e);
    }

    firstMember.readMessage((err, receivedMessage) => {
        if (err) {
            return console.log(err);
        }

        console.log("First member received message:", receivedMessage);
    });

    secondMember.readMessage((err, receivedMessage) => {
        if (err) {
            return console.log(err);
        }

        console.log("Second member received message:", receivedMessage);
    });

    groupDID_Document.sendMessage(dataToSend, (err)=>{
        if (err) {
            return console.log(err);
        }

        console.log("Group message sent");
    })
});

