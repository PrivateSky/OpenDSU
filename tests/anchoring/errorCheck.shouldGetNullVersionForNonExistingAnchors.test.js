require("../../../../psknode/bundles/testsRuntime");
const dc = require("double-check");
const { assert } = dc;
const utils = require('./utils');

assert.callback("Should get null or empty array version for non existing anchors", async (callback) => {
        const seedSSI = utils.generateSeedSSI();
        const anchorId = utils.getAnchorId(seedSSI);

        const AnchoringAbstractBehaviour = require('../../anchoring/anchoringAbstractBehaviour').AnchoringAbstractBehaviour;
        const MemoryPersistence = utils.MemoryPersistenceStrategy
        const ps = new MemoryPersistence();
        const ab = new AnchoringAbstractBehaviour(ps);

        ab.getLastVersion(anchorId, (err, data) => {
            assert.true(typeof err === 'undefined');
            assert.true(data === null || data === undefined);
            ab.getAllVersions(anchorId, (err, data) => {
                assert.true(typeof err === 'undefined');
                assert.true(Array.isArray(data));
                assert.true(data.length === 0)
                callback();
            });
        });

},2000);




