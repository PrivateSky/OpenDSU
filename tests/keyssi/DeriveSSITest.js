require('../../../../psknode/bundles/testsRuntime');

const assert = require('double-check').assert;
const keySSISpace = require('../../keyssi');
const crypto = require('../../crypto');

assert.callback('Derive from seedSSI', (callback) => {
  const templateSeedSSI = keySSISpace.createTemplateSeedSSI('default');

  templateSeedSSI.initialize('default', undefined, undefined, 'vn0', 'hint', (err, ssi) => {
    if (err) {
      throw err;
    }

    const sRead = ssi.derive();
    assert.true(sRead.getTypeName() === 'sread', 'Derived from seed is not sRead');

    const sza = sRead.derive();
    assert.true(sza.getTypeName() === 'sza', 'Derived from sRead is not sza');

    callback();
  });
});
