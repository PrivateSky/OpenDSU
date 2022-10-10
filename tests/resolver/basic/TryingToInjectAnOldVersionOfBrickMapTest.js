require('../../../../../psknode/bundles/testsRuntime');
const tir = require('../../../../../psknode/tests/util/tir');

const dc = require('double-check');
const assert = dc.assert;

const resolver = require('../../../resolver');
const utils = require('./utils');

assert.callback(`Trying to inject an old version of BrickMap in the latest BrickMap of current DSU`, async (testDone) => {
    const fs = require('fs');
    const env = await utils.mockEnvironment({ folder: 'inject-old-brickMap-test_' });

    await $$.promisify(tir.launchApiHubTestNode)(10, env.basePath);

    const initialData = '0 | lorem data';
    const expectedData = '1 | lorem data';
    const encrypt = false;

    // it creates a DSU
    const dsu = await $$.promisify(resolver.createDSUx)(env.domain, 'seed', { addLog: false });
    const keySSI = await $$.promisify(dsu.getKeySSIAsObject)();

    // it writes a file in DSU
    await $$.promisify(dsu.writeFile)('/example.txt', initialData, { encrypt });

    let [brickMap] = await utils.extractLatestBrickMap(env);

    // it writes a new version of the same file
    await $$.promisify(dsu.writeFile)('/example.txt', expectedData, { encrypt });

    const oldBrickMap = brickMap;
    [brickMap] = await utils.extractLatestBrickMap(env);

    // inject the old BrickMap
    await $$.promisify(fs.writeFile)(brickMap.path, oldBrickMap.buffer);
    console.log(`Write <oldBrickMap> to ${brickMap.path}`);

    // clear cache for current DSU
    env.vault.put(keySSI.getIdentifier(), undefined);
    await $$.promisify(resolver.invalidateDSUCache)(keySSI);

    // load DSU and check the targeted file
    let actualData;
    try {
        const loadedDSU = await $$.promisify(resolver.loadDSU)(keySSI);
        const buffer = await $$.promisify(loadedDSU.readFile)('/example.txt');
        actualData = buffer.toString();
    } catch (err) {
        assert.true(err.message.startsWith(`Failed to load DSU`), 'Error message');
        assert.true(err.originalMessage.startsWith(`Failed to validate brick`), 'Error originalMessage');
        testDone();
        return;
    }

    assert.notEqual(actualData, initialData, `An old version of BrickMap served the wrong brick!`);
    assert.notEqual(actualData, expectedData, `Test is redundat, BrickMap was served probably from cache!`);
    assert.false(true, `Test is wrong, data could not be loaded from DSU!`);

    testDone();
}, 60 * 1000);
