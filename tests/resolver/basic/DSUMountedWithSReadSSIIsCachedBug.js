const { promisify } = require('util');
require("../../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require('../../../resolver');
const keySSI = require("../../../keyssi")

const _createDSU = promisify(resolver.createDSU);
const _loadDSU = promisify(resolver.loadDSU);

// Test context:
// A ChildDSU is created
// A file is created in ChildDSU at /file
// A ParentDSU is created
// ChildDSU is mounted in ParentDSU at location /child using a SReadKeySSI
// Read the child's file using the parent: ParentDSU.readFile('/child/file')
// Update the child /file using the parent: ChildDSU.writeFile('/file', 'new data')
// Try an read the child file again using the parent: ParentDSU.readFile('/child/file')
// Make sure the result is not cached
assert.callback('Test caching for DSU mounted with SReadSSI', (testfinished) => {

    dc.createTestFolder('SReadSSIDSULoadCacheBug',(err,folder) => {
        testIntegration.launchApiHubTestNode(10, folder, async (err) => {
            if (err) {
                throw err;
            }

            // Create parent, child DSUs
            let [parentKeySSI, childKeySSI] = await createDSUs();

            // Load both parent & child
            let parentDSU = await loadDSU(parentKeySSI.getIdentifier());
            const childDSU = await loadDSU(childKeySSI.getIdentifier());


            // Get the current child status
            const childStatus = await parentDSU.readFile('/child/info');
            assert.true(childStatus.toString() === 'created', 'Child is created');

            // Update the child status
            await childDSU.writeFile('/info', 'updated');

            const currentChildStatus = await parentDSU.readFile('/child/info');
            assert.true(currentChildStatus.toString() === 'updated', 'Child has been updated')
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


function createKeySSI(domain) {
    domain = domain || 'default';
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
