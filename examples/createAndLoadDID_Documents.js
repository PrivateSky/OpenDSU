require("../../../psknode/bundles/testsRuntime");
const dc = require("double-check");
const tir = require("../../../psknode/tests/util/tir");

const openDSU = require("../index");
$$.__registerModule("opendsu", openDSU);

//load w3cdid API from "opendsu"
const w3cDID = openDSU.loadAPI("w3cdid");
const domain = "default";

dc.createTestFolder("apihubStorage", async (err, folder) => {
    await $$.promisify(tir.launchApiHubTestNode)(100, folder)

    let didDocument;
    try {
        // create instance of NameDID_Document
        // "name" is the type of DID method
        // "domain" is the blockchain domain in which data for the DID document is stored
        // "public_name" is the public name of the DID document
        didDocument = await $$.promisify(w3cDID.createIdentity)("name", domain, "public_name");
    } catch (e) {
        return console.log(e);
    }

    const didIdentifier = didDocument.getIdentifier();
    console.log(didIdentifier); //expected: did:ssi:name:default:public_name

    let resolvedDID_Document;
    try {
        // get a NameDID_Document instance by resolving the didIdentifier
        resolvedDID_Document = await $$.promisify(w3cDID.resolveDID)(didIdentifier);
    } catch (e) {
        return console.log(e);
    }
    console.log(resolvedDID_Document.getIdentifier()); //expected: did:ssi:name:default:public_name
});

