require("../../../../psknode/bundles/testsRuntime");
const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);

const keySSISpace = openDSU.loadAPI("keyssi");
const anchoring = openDSU.loadAPI("anchoring");
const crypto = openDSU.loadAPI("crypto");

const anchoringX = anchoring.getAnchoringX();
let TIMEOUT = 3000;
const PARALLEL_CALLS = 100;
const DOMAIN = "default";

function createAnchorObject(callback) {
    keySSISpace.createSeedSSI(DOMAIN, 'v0', 'hint', async (err, seedSSI) => {
        if (err) {
            return callback(err);
        }

        const anchorID = seedSSI.getAnchorId(true);
        const timestamp = Date.now();
        const brickMapHash = "hash";
        const dataToSign = anchorID + brickMapHash + timestamp;
        const signature = await $$.promisify(crypto.sign)(seedSSI, dataToSign);
        const signedHashLinkSSI = keySSISpace.createSignedHashLinkSSI(DOMAIN, brickMapHash, timestamp, signature.toString("base64"));
        const signedHashLinkSSIIdentifier = signedHashLinkSSI.getIdentifier(true);
        const anchorObject = {
            anchorId: anchorID,
            anchorValue: signedHashLinkSSIIdentifier
        }

        callback(undefined, anchorObject);
    })
}

let cfg = {
    timeOut: TIMEOUT,
    parallelCalls: PARALLEL_CALLS,
    testFunction: function (end) {
        createAnchorObject((err, anchorObject) => {
            if (err) {
                return end(err);
            }
            anchoringX.createAnchor(anchorObject.anchorId, anchorObject.anchorValue, end);
        })
    }
};

assert.begin("Performance testing", TIMEOUT + 1000);

assert.performance(cfg, (errs, result) => {
    console.log("Executed successfully ", result.actualRate, " steps per second with errors", errs);
});
