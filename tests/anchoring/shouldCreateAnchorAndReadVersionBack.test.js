require("../../../../psknode/bundles/testsRuntime");
const dc = require("double-check");
const { assert } = dc;
const utils = require('./utils');

assert.callback("Should create new anchor and read all versions back", async (callback) => {
        const seedSSI = utils.generateSeedSSI();
        const anchorId = utils.getAnchorId(seedSSI);
        const hashlink = await utils.getSignedHashLink(seedSSI,null);

        const AnchoringAbstractBehaviour = require('../../anchoring/anchoringAbstractBehaviour').AnchoringAbstractBehaviour;
        const MemoryPersistence = utils.MemoryPersistenceStrategy
        const ps = new MemoryPersistence();
        const ab = new AnchoringAbstractBehaviour(ps);
        ab.createAnchor(anchorId, hashlink, (err) =>{
            assert.true(typeof err === 'undefined');
                ab.getAllVersions(anchorId, (err, data) => {
                        assert.true(typeof err === 'undefined');
                        assert.true(data[0] === hashlink);
                        callback();
                });

        });
},2000);




