require('../../../../psknode/bundles/testsRuntime');

const assert = require('double-check').assert;
const errorSpace = require('../../error');

assert.callback(
  'registerMandatoryCallback test',
  (callback) => {
    function testFunction() {
      console.log('running');
    }
    const result = errorSpace.registerMandatoryCallback(testFunction, 1000);
    errorSpace.observeUserRelevantMessages('error', (message) => {
      assert.true(false);
    });
    result();
    setTimeout(() => callback(), 2000);
  },
  3000
);
