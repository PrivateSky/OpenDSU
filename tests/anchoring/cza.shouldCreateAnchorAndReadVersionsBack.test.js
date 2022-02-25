require("../../../../psknode/bundles/testsRuntime");
const dc = require("double-check");
const { assert } = dc;
const utils = require('./utils');

assert.callback("Should create new anchor of type CZA and read versions back", async (callback) => {
        const constSSI = utils.generateConstSSI();
        const anchorId = utils.getAnchorId(constSSI);
        const hashlink = await utils.getHashLink(constSSI);

        const AnchoringAbstractBehaviour = require('../../anchoring/anchoringAbstractBehaviour').AnchoringAbstractBehaviour;
        const MemoryPersistence = utils.MemoryPersistenceStrategy
        const ps = new MemoryPersistence();
        const ab = new AnchoringAbstractBehaviour(ps);
        ab.createAnchor(anchorId, hashlink, (err) =>{
                assert.true(typeof err === 'undefined');
                ab.getLastVersion(anchorId, (err, data) =>{
                        assert.true(typeof err === 'undefined');
                        assert.true(data.getIdentifier() === hashlink);
                        ab.getAllVersions(anchorId,(err, data) =>{
                                assert.true(typeof err === 'undefined');
                                assert.true(data[0].getIdentifier() === hashlink);
                                assert.true(data.length === 1);
                                callback();
                        })
                })

        });
},2000);
