require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const keySSI = openDSU.loadAPI("keyssi");
const resolver = openDSU.loadAPI("resolver");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");

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

assert.callback('key DID SSI test', (testFinished) => {
    const domain = 'default';
    let sc;

    dc.createTestFolder('createDSU', async (err, folder) => {
        configureDomain(folder, domain);
        tir.launchApiHubTestNode(10, folder, async (err) => {
            if (err) {
                throw err;
            }
            const initializeSC = async () => {
                try {
                    const seedDSU = await $$.promisify(resolver.createSeedDSU)(domain);
                    const seedSSI = await $$.promisify(seedDSU.getKeySSIAsObject)()
                    sc = scAPI.getSecurityContext(seedSSI);
                } catch (e) {
                    throw e;
                }
            }

            let decryptedMessage;
            const dataToSend = "someData";

            try {
                await initializeSC();
                const senderDIDDocument = await $$.promisify(w3cDID.createIdentity)("name", domain, "sender");
                const receiverDIDDocument = await $$.promisify(w3cDID.createIdentity)("name", domain, "receiver");

                await $$.promisify(senderDIDDocument.sendMessage)(dataToSend, receiverDIDDocument);
                const resolvedDIDDocument = await $$.promisify(w3cDID.resolveDID)(receiverDIDDocument.getIdentifier());
                decryptedMessage = await $$.promisify(resolvedDIDDocument.readMessage)();
            } catch (e) {
                return console.log(e);
            }

            assert.equal(decryptedMessage.message.toString(), dataToSend, "The received message is not the same as the message sent");
            testFinished();
        });
    });
}, 10000);

