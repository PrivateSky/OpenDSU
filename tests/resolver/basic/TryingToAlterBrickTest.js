require('../../../../../psknode/bundles/testsRuntime');
const tir = require('../../../../../psknode/tests/util/tir');

const dc = require('double-check');
const assert = dc.assert;

const resolver = require('../../../resolver');
const utils = require('./utils');

assert.callback(`Alter the content of a raw brick`, async (testDone) => {
    const fs = require('fs');
    const env = await utils.mockEnvironment({ folder: 'alter-brick-test_' });

    const rawData = 'lorem data';
    const injectedData = 'injected data';

    await $$.promisify(tir.launchApiHubTestNode)(10, env.basePath);

    // it creates and writes in DSU
    const dsu = await $$.promisify(resolver.createDSUx)(env.domain, 'seed');
    await $$.promisify(dsu.writeFile)('/example.txt', rawData, { encrypt: false });

    // get the victim brick
    const bricks = await utils.extractBricks(env);
    const brick = bricks.find(brick => brick.buffer.toString() === rawData);

    // override content of a brick
    await $$.promisify(fs.writeFile)(brick.path, injectedData);
    await checkDataCorruption(dsu, '/example.txt', 'Overriding content...');

    // reset to original brick
    await $$.promisify(fs.writeFile)(brick.path, brick.buffer);

    // append content to a brick
    await $$.promisify(fs.appendFile)(brick.path, injectedData);
    await checkDataCorruption(dsu, '/example.txt', 'Appending content...');

    testDone();
}, 15 * 1000);

async function checkDataCorruption(dsu, file, message) {
    try {
        const alteredData = await $$.promisify(dsu.readFile)(file);
        console.log({ utf8: alteredData.toString() });
        assert.true(false, 'Data corruption happened and not detected when overriding the content!');
    } catch (err) {
        console.log(message);
        assert.true(err.message.startsWith(`Failed to create buffer from bricks`), 'Error message');
        assert.true(err.originalMessage.startsWith(`Failed to validate brick`), 'Error originalMessage');
    }
}