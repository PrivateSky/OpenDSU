require('../../../../psknode/bundles/testsRuntime');
const testIntegration = require('../../../../psknode/tests/util/tir');
const dc = require('double-check');
const assert = dc.assert;
const crypto = require('../../crypto');

const httpSpace = require('../../http');

assert.callback(
  'doPut test',
  (endTest) => {
    const dlDomain = 'default';
    const brickData = {
      userId: 1,
      id: 1,
      title: 'This is a title',
      body:
        'quia et suscipit\nsuscipit recusandae consequuntur expedita et cum\nreprehenderit molestiae ut ut quas totam\nnostrum rerum est autem sunt rem eveniet architecto',
    };

    dc.createTestFolder('testFolder', (err, folder) => {
      if (err) {
        assert.true(false);
        throw err;
      }
      testIntegration.launchApiHubTestNode(10, folder, (err, port) => {
        if (err) {
          assert.true(false);
          throw err;
        }
        httpSpace.doPut(
          `http://localhost:${port}/bricking/${dlDomain}/put-brick/${dlDomain}`,
          JSON.stringify(brickData),
          async (err, data) => {
            if (err) {
              assert.true(false, 'Unexpected error');
              throw err;
            }

            try {
              if (!data || !JSON.parse(data).message) {
                assert.true(false, 'no reply from server');
              }
              const brickHash = JSON.parse(data).message;

              const calculatedBrickHash = crypto.sha256(JSON.stringify(brickData));

              assert.true(brickHash === calculatedBrickHash, 'brick hashes not equal');

              const response = await httpSpace.fetch(
                `http://localhost:${port}/bricking/${dlDomain}/get-brick/${brickHash}`
              );
              const json = await response.json();

              assert.true(response, 'No response');
              assert.true(response.ok === true, 'Response error');

              assert.true(JSON.stringify(json) === JSON.stringify(brickData), 'bricks not equal');
              endTest();
            } catch (error) {
              assert.true(false, 'Error during communication');
              endTest();
            }
          }
        );
      });
    });
  },
  20000
);
