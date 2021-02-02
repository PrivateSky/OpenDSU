require('../../../../psknode/bundles/testsRuntime');

const assert = require('double-check').assert;
const errorSpace = require('../../error');

assert.callback('Verify error messages test', (callback) => {
  const myMessage = errorSpace.observeUserRelevantMessages('dev', (message) => {
    assert.true(message === 'reportDevRelevantInfo message');
    callback();
  });
  errorSpace.reportDevRelevantInfo('reportDevRelevantInfo message');
});
