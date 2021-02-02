require('../../../../psknode/bundles/testsRuntime');

const assert = require('double-check').assert;
const keySSISpace = require('../../keyssi');
const crypto = require('../../crypto');

assert.callback('Build seedSSI test', (callback) => {
  const seedSSI = keySSISpace.buildSeedSSI('default');

  seedSSI.initialize('default', undefined, undefined, 'vn0', 'hint', (err) => {
    if (err) {
      throw err;
    }

    crypto.sign(seedSSI, 'Test text', (err, signature) => {
      if (err) {
        throw err;
      }

      crypto.verifySignature(seedSSI, 'Test text', signature, (err, status) => {
        if (err) {
          throw err;
        }
        assert.true(status);
        callback();
      });
    });
  });
});
