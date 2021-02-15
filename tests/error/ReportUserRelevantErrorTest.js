require('../../../../psknode/bundles/testsRuntime');

const assert = require('double-check').assert;
const errorSpace = require('../../error');

assert.callback('Verify error messages test', (callback) => {
  let e;

  try {
    throw 'this is an error';
  } catch (error) {
    e = error;
  }
  const result = errorSpace.createOpenDSUErrorWrapper('This error happened', e);

  errorSpace.observeUserRelevantMessages('error', (message) => {
    callback();
  });
  errorSpace.reportUserRelevantError('reportUserRelevantError message', result);
});
