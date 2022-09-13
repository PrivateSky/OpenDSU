require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("openDSU", openDSU);
const anchoring = openDSU.loadAPI("anchoring");
const keySSISpace = openDSU.loadAPI("keyssi");

const DOMAIN = "default";

async function getAnchorId(seedSSI, raw = false) {
    const keySSISpace = openDSU.loadApi("keyssi");
    const anchorSSI = keySSISpace.parse(seedSSI.getAnchorId());
    const anchorID = anchorSSI.getIdentifier(raw);
    return anchorID;
}

async function createNewVersionForAnchor(seedSSI, brickMapHash = "hash1", previousVersion) {
    const crypto = openDSU.loadAPI("crypto");
    const keySSISpace = openDSU.loadAPI("keyssi");
    let timestamp = Date.now() + '';
    let anchorID = await getAnchorId(seedSSI, true);
    let dataToSign = anchorID + brickMapHash + timestamp;
    if (previousVersion) {
        previousVersion = keySSISpace.parse(previousVersion);
        previousVersion = previousVersion.getIdentifier(true);
        dataToSign = anchorID + brickMapHash + previousVersion + timestamp;
    }
    let signature = await $$.promisify(crypto.sign)(seedSSI, dataToSign);
    let signedHashLinkSSI1 = keySSISpace.createSignedHashLinkSSI(DOMAIN, brickMapHash, timestamp, signature.toString("base64"));
    return signedHashLinkSSI1.getIdentifier();
}


assert.callback('key DID SSI test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const domainConfig = {
            "anchoring": {
                "type": "OBA",
                "option": {
                    endpoint:"http://localhost:3000"
                }
            }
        }
        await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: DOMAIN, config: domainConfig}]});
        const NO_ANCHORS = 10000;
        const TaskCounter = require("swarmutils").TaskCounter;
        const taskCounter = new TaskCounter(async () => {
            console.timeEnd("anchorProcessing");
        })
        taskCounter.increment(NO_ANCHORS);
        const anchoringX = anchoring.getAnchoringX();
        console.time("anchorProcessing")
        for (let i = 0; i < NO_ANCHORS; i++) {
            let dsuIdentifier = await keySSISpace.createSeedSSI(DOMAIN);
            let anchorId = dsuIdentifier.getAnchorId();
            let anchorVersion = await createNewVersionForAnchor(dsuIdentifier);
            try {
                await $$.promisify(anchoringX.createAnchor)(anchorId, anchorVersion);
                taskCounter.decrement();
            }catch (e) {
                console.log(e);
            }
        }
    });
}, 10000000);