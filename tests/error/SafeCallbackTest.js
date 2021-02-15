require('../../../../psknode/bundles/testsRuntime');

const assert = require('double-check').assert;
const errorSpace = require('../../error');

assert.callback(
  'Verify callback test',
  (callback) => {
    errorSpace.observeUserRelevantMessages('warn', (message) => {
      assert.true(message === 'Ignored result. Please add a proper callback when using this function! ' + undefined);
      callback();
    });

    let result = errorSpace.OpenDSUSafeCallback(callback);
    assert.true(typeof result === 'function', 'not a callback');

    result = errorSpace.OpenDSUSafeCallback('random string');
    result();
  },
  9000
);

// TODO: fix this
