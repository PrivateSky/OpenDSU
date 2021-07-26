const { promisify } = require('util');
require("../../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require('../../../resolver');
const keySSI = require("../../../keyssi")

const _createDSU = promisify(resolver.createDSU);
const _loadDSU = promisify(resolver.loadDSU);

assert.callback('LoadDSUSkipCacheTest', (testfinished) => {

    dc.createTestFolder('loadDSUSkipCache',(err,folder) => {
        testIntegration.launchApiHubTestNode(10, folder, async (err) => {
            if (err) {
                throw err;
            }

            // Create parent, child DSUs
            let [parentKeySSI, childKeySSI] = await createDSUs();

            // Test that the same instance is returned when cached
            let firstParentInstance = await loadDSU(parentKeySSI);
            let secondParentInstance = await loadDSU(parentKeySSI);
            assert.true(firstParentInstance === secondParentInstance, "Same DSU instance is returned when cached");

            // Test that a different instance is returned when loading DSU with skipCache option
            secondParentInstance = await loadDSU(parentKeySSI, { skipCache: true });
            assert.true(firstParentInstance !== secondParentInstance, "Different DSU instance is returned when cache is skipped");

            // Test the the "skipCache" option is propagated to dsu mounts
            let childInstance = await loadDSU(childKeySSI);

            // Update the child
            await childInstance.writeFile('/info', 'updated');

            const info = await secondParentInstance.readFile('/child/info');
            assert.true(info.toString() === 'updated', "Child info isn't cached");

            testfinished();
        })
    })
}, 5000);

async function createDSUs() {
    // Create child DSU
    const childDSU = await createDSU();
    const childKeySSI = await childDSU.getKeySSIAsObject();
    await childDSU.writeFile('/info', 'created');

    // Create parent DSU
    const parentDSU = await createDSU();
    const parentKeySSI = await parentDSU.getKeySSIAsObject();

    const sreadSSI = childKeySSI.derive().getIdentifier();
    // Mount child in parent
    await parentDSU.mount('/child', sreadSSI);
    return [parentKeySSI, childKeySSI];
}

async function createDSU() {
    const keyssi = await createKeySSI();
    const dsu = await _createDSU(keyssi);

    promisifyDSU(dsu);
    return dsu;
}

async function loadDSU(...args) {
    const dsu = await _loadDSU(...args)
    promisifyDSU(dsu);
    return dsu;
}


function createKeySSI() {
    return new Promise((resolve, reject) => {
        keySSI.createTemplateSeedSSI('default', (err, templateKeySSI) => {
            if (err) {
                return reject(err);
            }
            templateKeySSI.initialize(templateKeySSI.getDLDomain(), undefined, undefined, undefined, templateKeySSI.getHint(), (err, keySSI) => {
                if (err) {
                    return reject(err);
                }
                resolve(keySSI);
            });
        });
    })
}


function promisifyDSU(...args) {
    // Methods to promisify
    const methodsToPromisify = [
        'getLastHashLinkSSI',
        'getKeySSI',
        'getKeySSIAsObject',
        'getKeySSIAsString',
        'addFiles',
        'appendToFile',
        'addFolder',
        'addFile',
        'readFile',
        'extractFolder',
        'extractFile',
        'writeFile',
        'delete',
        'rename',
        'listFiles',
        'listFolders',
        'createFolder',
        'cloneFolder',
        'enableAnchoringNotifications',
        'enableAutoSync',
        'readDir',
        'mount',
        'unmount',
        'listMountedDSUs',
        'commitBatch',
        'cancelBatch',
        'batch',
    ]

    for (const dsu of args) {
        for (const method of methodsToPromisify) {
            dsu[method] = promisify(dsu[method]);
        }
    }
}
