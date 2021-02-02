require('../../../../psknode/bundles/testsRuntime');

const assert = require('double-check').assert;
const errorSpace = require('../../error');

assert.callback('Verify error messages test', (callback) => {
  errorSpace.observeUserRelevantMessages('warn', (message) => {
    callback();
  });

  errorSpace.reportUserRelevantWarning('reportUserRelevantWarning message');
});
