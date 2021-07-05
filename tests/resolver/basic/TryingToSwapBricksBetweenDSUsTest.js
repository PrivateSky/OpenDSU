require('../../../../../psknode/bundles/testsRuntime');
const tir = require('../../../../../psknode/tests/util/tir');

const dc = require('double-check');
const assert = dc.assert;

const resolver = require('../../../resolver');
const utils = require('./utils');

assert.callback('Trying to alter BrickMap of a DSU', async (testDone) => {
    const fs = require('fs');
    const env = await utils.mockEnvironment({ folder: 'swapping-bricks-test_' });

    await $$.promisify(tir.launchApiHubTestNode)(10, env.basePath);

    // it creates and writes in dsu0 (in batch mode)
    const dsu0 = await $$.promisify(resolver.createDSUx)(env.domain, 'seed', { addLog: false });
    const dsu0_keySSI = await $$.promisify(dsu0.getKeySSIAsObject)();
    dsu0.beginBatch();
    await $$.promisify(dsu0.writeFile)('/example0.txt', '0 | lorem data 0', { encrypt: false });
    await $$.promisify(dsu0.writeFile)('/example1.txt', '0 | lorem data 1', { encrypt: false });
    await $$.promisify(dsu0.writeFile)('/example2.txt', '0 | lorem data 2', { encrypt: false });
    await $$.promisify(dsu0.commitBatch)();

    const dsu0_bricks = await utils.extractBricks(env);
    const dsu0_hashes = dsu0_bricks.map(brick => brick.hash);

    // it creates and writes in dsu1 (in batch mode)
    const dsu1 = await $$.promisify(resolver.createDSUx)(env.domain, 'seed', { addLog: false });
    const dsu1_keySSIString = await $$.promisify(dsu1.getKeySSIAsString)();
    dsu1.beginBatch();
    await $$.promisify(dsu1.writeFile)('/example0.txt', '1 | lorem data 0', { encrypt: false });
    await $$.promisify(dsu1.writeFile)('/example1.txt', '1 | lorem data 1', { encrypt: false });
    await $$.promisify(dsu1.writeFile)('/example2.txt', '1 | lorem data 2', { encrypt: false });
    await $$.promisify(dsu1.commitBatch)();

    const dsu1_bricks = (await utils.extractBricks(env)).filter(dsu1_brick => !dsu0_hashes.includes(dsu1_brick.hash));

    // swap bricks
    const dsu0_promises = dsu0_bricks.map((dsu0_brick, i) => (async () => {
        await $$.promisify(fs.writeFile)(dsu0_brick.path, dsu1_bricks[i].buffer);
    })());
    const dsu1_promises = dsu1_bricks.map((dsu1_brick, i) => (async () => {
        await $$.promisify(fs.writeFile)(dsu1_brick.path, dsu0_bricks[i].buffer);
    })());
    await Promise.all([...dsu0_promises, ...dsu1_promises]);

    // it removes dsu0 and dsu1 from cache
    env.vault.put(dsu0_keySSI.getIdentifier(), undefined);
    env.vault.put(dsu1_keySSIString, undefined);

    // commented for optimisation reasons, but now BrickMaps are still cached in psk-cache
    // await utils.fillCacheEntirely(env);

    // load data from altered DSUs
    try {
        const dsu0_loaded = await $$.promisify(resolver.loadDSU)(dsu0_keySSI);
        const dsu0_data = await $$.promisify(dsu0_loaded.readFile)('/example0.txt');

        const dsu1_loaded = await $$.promisify(resolver.loadDSU)(dsu1_keySSIString);
        const dsu1_data = await $$.promisify(dsu1_loaded.readFile)('/example0.txt');

        console.log({ dsu0_data, dsu1_data });
        console.log({ dsu0_utf8: dsu0_data.toString(), dsu1_utf8: dsu1_data.toString() });
        assert.true(false, `Should not be able to read from 'dsu0' and 'dsu1'!`);
    } catch (err) {
        assert.true(
            err.message.startsWith(`Failed to load DSU`) ||
            err.message.startsWith(`Failed to create buffer from bricks`),
            'Error message');
        assert.true(err.originalMessage.startsWith(`Failed to validate brick`), 'Error originalMessage');
    }

    testDone();
}, 5 * 60 * 1000);