require('../../../../psknode/bundles/testsRuntime');

const assert = require('double-check').assert;
const keySSISpace = require('../../keyssi');
const crypto = require('../../crypto');

assert.callback('Derive from seedSSI', (callback) => {
  const templateSeedSSI = keySSISpace.createTemplateSeedSSI('default');

  templateSeedSSI.initialize('default', undefined, undefined, 'v0', 'hint', async (err, ssi) => {
    if (err) {
      throw err;
    }

    const sRead = await $$.promisify(ssi.derive)();
    assert.true(sRead.getTypeName() === 'sread', 'Derived from seed is not sRead');

    const sza = await $$.promisify(sRead.derive)();
    assert.true(sza.getTypeName() === 'sza', 'Derived from sRead is not sza');

    callback();
  });
});
