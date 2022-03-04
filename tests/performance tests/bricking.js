require("../../../../psknode/bundles/testsRuntime");
const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);

const keySSISpace = openDSU.loadAPI("keyssi");
const bricking = openDSU.loadAPI("bricking");
const crypto = openDSU.loadAPI("crypto");

let TIMEOUT = 3000;
const PARALLEL_CALLS = 100;
const DOMAIN = "default";
const NUMBER_OF_BRICKS = 100;

let hashLinks = [];

function writeBrick(callback) {

  const brickLength = Math.floor(Math.random() * 1014 * 1024) + 10 * 1024;
  const brickData = crypto.generateRandom(brickLength);
  bricking.putBrick(DOMAIN, brickData, (err, brickHash) => {
    if (err) {
      return callback(err);
    }
    const hashLink = keySSISpace.createHashLinkSSI(DOMAIN, brickHash);
    hashLinks.push(hashLink);
    callback();
  });

}

function writeBricks(callback) {
  let counter = NUMBER_OF_BRICKS;
  for (let i = 0; i < NUMBER_OF_BRICKS; i++) {
    writeBrick((err) => {
      counter--;
      if (counter === 0) {
        return callback();
      }
    })
  }
}
assert.begin("Performance testing", TIMEOUT + 10000);
writeBricks(() => {

  let index = 0;
  let cfg = {
    timeOut: TIMEOUT,
    parallelCalls: PARALLEL_CALLS,
    testFunction: function (end) {
      bricking.getBrick(hashLinks[index], end);
      index = (index + 1) % NUMBER_OF_BRICKS;
    }
  };
  assert.performance(cfg, (errs, result) => {
    console.log("Executed successfully ", result.actualRate, " steps per second with errors", errs);
  });
})

