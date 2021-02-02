require('../../../../psknode/bundles/testsRuntime');

const assert = require('double-check').assert;
const keySSISpace = require('../../keyssi');
const crypto = require('../../crypto');

assert.callback('Build seedSSI test', (callback) => {
  const buildSeedSSI = keySSISpace.buildSeedSSI('default');

  buildSeedSSI.initialize('default', undefined, undefined, 'vn0', 'hint', (err) => {
    if (err) {
      throw err;
    }

    const vn = buildSeedSSI.getVn();
    const hint = buildSeedSSI.getHint();
    const type = buildSeedSSI.getTypeName();
    const DLDomain = buildSeedSSI.getDLDomain();

    assert.true(vn === 'vn0', 'Invalid vn0 property');
    assert.true(hint === 'hint', 'Invalid hint property');
    assert.true(type === 'seed', 'Invalid seed property');
    assert.true(DLDomain === 'default', 'Invalid domain property');

    const identifier = buildSeedSSI.getIdentifier();
    const decodedIdentifier = crypto.decodeBase58(identifier).toString();

    assert.true(decodedIdentifier.includes('vn0'), 'Invalid vn0 property on decoded identifier');
    assert.true(decodedIdentifier.includes('hint'), 'Invalid hint property  on decoded identifier');
    assert.true(decodedIdentifier.includes('seed'), 'Invalid seed property  on decoded identifier');
    assert.true(decodedIdentifier.includes('default'), 'Invalid domain property  on decoded identifier');

    callback();
  });
});
