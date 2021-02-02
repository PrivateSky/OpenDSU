require('../../../../psknode/bundles/testsRuntime');

const assert = require('double-check').assert;
const errorSpace = require('../../error');

assert.callback(
  'Verify error if callback is not called test',
  (callback) => {
    function cb() {
      console.log('cb called');
    }

    const result = errorSpace.registerMandatoryCallback(cb);

    errorSpace.observeUserRelevantMessages('error', (message) => {
      callback();
    });

    setTimeout(() => {
      try {
        result();
      } catch (error) {
        callback();
      }
    }, 6000);
  },
  8000
);
