require('../../../../psknode/bundles/testsRuntime');
const assert = require('double-check').assert;
const dc = require("double-check");
const tir = require("../../../../psknode/tests/util/tir");
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const scAPI = openDSU.loadAPI("sc");
const crypto = openDSU.loadAPI("crypto")

assert.callback("FSx API test", (callback) => {
    dc.createTestFolder('fsx', async (err, folder) => {
        const domain = "default";
        const config = {
            domains: [{
                name: domain, config: {
                    anchoring: {
                        "type": "FS"
                    }
                }
            }],
        }
        await tir.launchConfigurableApiHubTestNodeAsync(config);
        const anchoring = openDSU.loadAPI("anchoring");
        const anchoringX = anchoring.getAnchoringX();
        const keySSISpace = openDSU.loadAPI("keyssi");
        const seedSSI = await $$.promisify(keySSISpace.createSeedSSI)(domain, 'v0', 'hint');
        // const publicKeyRaw = seedSSI.getPublicKey("raw");
        const anchorSSI = keySSISpace.parse(await $$.promisify(seedSSI.getAnchorId)());
        const anchorID = anchorSSI.getIdentifier(true);
        let timestamp = Date.now();
        let brickMapHash = "hash1";
        let dataToSign = anchorID + brickMapHash + timestamp;
        let signature = await $$.promisify(crypto.sign)(seedSSI, dataToSign);
        let signedHashLinkSSI1 = keySSISpace.createSignedHashLinkSSI(domain, brickMapHash, timestamp, signature.toString("base64"));
        await $$.promisify(anchoringX.createAnchor)(anchorSSI.getIdentifier(), signedHashLinkSSI1.getIdentifier());
        let lastVersion = await $$.promisify(anchoringX.getLastVersion)(anchorSSI.getIdentifier());
        assert.equal(lastVersion.getIdentifier(), signedHashLinkSSI1.getIdentifier());
        let versions = await $$.promisify(anchoringX.getAllVersions)(anchorSSI.getIdentifier());
        assert.equal(versions.length, 1);
        assert.equal(versions[0].getIdentifier(), signedHashLinkSSI1.getIdentifier());

        timestamp = Date.now();
        brickMapHash = "hash2";
        dataToSign = anchorID + brickMapHash + signedHashLinkSSI1.getIdentifier(true) + timestamp;
        signature = await $$.promisify(crypto.sign)(seedSSI, dataToSign);
        signedHashLinkSSI1 = keySSISpace.createSignedHashLinkSSI(domain, brickMapHash, timestamp, signature.toString("base64"));
        await $$.promisify(anchoringX.appendAnchor)(anchorSSI.getIdentifier(), signedHashLinkSSI1.getIdentifier());

        versions = await $$.promisify(anchoringX.getAllVersions)(anchorSSI.getIdentifier());
        assert.equal(versions.length, 2);
        assert.equal(versions[1].getIdentifier(), signedHashLinkSSI1.getIdentifier());

        lastVersion = await $$.promisify(anchoringX.getLastVersion)(anchorSSI.getIdentifier());
        assert.equal(lastVersion.getIdentifier(), signedHashLinkSSI1.getIdentifier());
        callback();
    });
}, 10000)