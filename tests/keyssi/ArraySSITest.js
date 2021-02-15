require('../../../../psknode/bundles/testsRuntime');

const assert = require('double-check').assert;
const keySSISpace = require('../../keyssi');
const crypto = require('../../crypto');

assert.callback('Build array SSI test', (callback) => {
  const arraySSI = keySSISpace.buildArraySSI('default', ['openDsu', 16], 'vn0', 'hint');

  const vn = arraySSI.getVn();
  const hint = arraySSI.getHint();
  const type = arraySSI.getTypeName();
  const DLDomain = arraySSI.getDLDomain();

  assert.true(vn === 'vn0', 'Invalid vn0 property');
  assert.true(hint === 'hint', 'Invalid hint property');
  assert.true(type === 'array', 'Invalid seed property');
  assert.true(DLDomain === 'default', 'Invalid domain property');

  callback();
});

assert.callback('Pass non-array object check', (callback) => {
  try {
    keySSISpace.buildArraySSI('default', 12, 'vn0', 'hint');
  } catch (err) {
    console.log(err);
    callback();
    return;
  }
  callback();
});
