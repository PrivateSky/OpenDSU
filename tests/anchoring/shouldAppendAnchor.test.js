require("../../../../psknode/bundles/testsRuntime");
const dc = require("double-check");
const { assert } = dc;
const utils = require('./utils');

assert.callback("Should append anchor", async (callback) => {
        const seedSSI = utils.generateSeedSSI();
        const anchorId = utils.getAnchorId(seedSSI);
        const hashlink = await utils.getSignedHashLink(seedSSI,null);
        const hashlink2 = await utils.getSignedHashLink(seedSSI,hashlink);

        const AnchoringAbstractBehaviour = require('../../anchoring/anchoringAbstractBehaviour').AnchoringAbstractBehaviour;
        const MemoryPersistence = utils.MemoryPersistenceStrategy
        const ps = new MemoryPersistence();
        const ab = new AnchoringAbstractBehaviour(ps);
        ab.createAnchor(anchorId, hashlink, (err) => {
                assert.true(typeof err === 'undefined');
                ab.appendAnchor(anchorId, hashlink2, (err) => {
                        assert.true(typeof err === 'undefined');
                        ab.getAllVersions(anchorId, (err, data) => {
                                assert.true(typeof err === 'undefined');
                                assert.true(data[0] === hashlink);
                                assert.true(data[1] === hashlink2);
                                assert.true(data.length === 2);
                                ab.getLastVersion(anchorId, (err, data) => {
                                        assert.true(typeof err === 'undefined');
                                        assert.true(data === hashlink2);
                                        callback();
                                });
                        });
                });
        });
},2000);




