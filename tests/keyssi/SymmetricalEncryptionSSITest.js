require('../../../../psknode/bundles/testsRuntime');

const assert = require('double-check').assert;
const keySSISpace = require('../../keyssi');
const crypto = require('../../crypto');

assert.callback('Test SymmetricalEncryptionSSI ', (callback) => {
  const seSSI = keySSISpace.buildSymmetricalEncryptionSSI('default', 'encryptionKey', 'control', 'vn', 'hint');

  const hint = seSSI.getHint();
  const type = seSSI.getTypeName();
  const DLDomain = seSSI.getDLDomain();

  assert.true(hint === 'hint', 'Invalid hint property');
  assert.true(type === 'se', 'Invalid seed property');
  assert.true(DLDomain === 'default', 'Invalid domain property');

  callback();
});
