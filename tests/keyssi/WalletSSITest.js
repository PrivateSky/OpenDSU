require('../../../../psknode/bundles/testsRuntime');

const assert = require('double-check').assert;
const keySSISpace = require('../../keyssi');
const crypto = require('../../crypto');

assert.callback('Test buildWalletSSI ', (callback) => {
  const walletSSI = keySSISpace.buildWalletSSI('default', ['cred1', 'cred2'], 'hint');

  const hint = walletSSI.getHint();
  const type = walletSSI.getTypeName();
  const DLDomain = walletSSI.getDLDomain();

  console.log(hint, type, DLDomain);

  assert.true(hint === 'hint', 'Invalid hint property');
  assert.true(type === 'wallet', 'Invalid seed property');
  assert.true(DLDomain === 'default', 'Invalid domain property');

  callback();
});

assert.callback('Check if arg is not array', (callback) => {
  try {
    const walletSSI = keySSISpace.buildWalletSSI('default', 12, 'hint');
    console.log(walletSSI);
  } catch (error) {
    callback();
  }
});
