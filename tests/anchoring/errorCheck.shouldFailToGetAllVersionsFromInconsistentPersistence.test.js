require("../../../../psknode/bundles/testsRuntime");
const dc = require("double-check");
const { assert } = dc;
const utils = require('./utils');

assert.callback("Should fail to get versions from inconsistent persistence", async (callback) => {

    const AnchoringAbstractBehaviour = require('../../anchoring/anchoringAbstractBehaviour').AnchoringAbstractBehaviour;
    const {anchorId, cmp} = await utils.getPopulatedCorruptedMemoryPersistence()
    const ab = new AnchoringAbstractBehaviour(cmp);

    ab.getLastVersion(anchorId, (err, data) => {
        assert.true(typeof err === 'undefined');
        ab.getAllVersions(anchorId, (err, data) => {
            assert.true(typeof err !== 'undefined');
            callback();
        });
    });

},2000);




