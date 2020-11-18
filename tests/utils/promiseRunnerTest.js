require("../../../../psknode/bundles/testsRuntime");
const assert = require("double-check").assert;

const promiseRunner = require("../../utils/promise-runner");

assert.callback("T1 promiseRunner runOne success", (callback) => {
  const entries = [1, 2, 3, 4, 5];
  const execute = (entry) => {
    return new Promise((resolve) => {
      console.log(`T1 Running entry ${entry}`);
      resolve(entry);
    });
  };

  promiseRunner.runOne(entries, execute, (err, result) => {
    if (err) throw err;
    assert.notNull(result);
    callback();
  });
});

assert.callback("T2 promiseRunner runOne success with first fail", (callback) => {
  const entries = [1, 2, 3, 4, 5];
  let hasFailed = false;

  const execute = (entry) => {
    return new Promise((resolve, reject) => {
      console.log(`T2 Running entry ${entry}`);

      if (!hasFailed) {
        hasFailed = true;
        return reject();
      }
      resolve(entry);
    });
  };

  promiseRunner.runOne(entries, execute, (err, result) => {
    if (err) throw err;
    assert.notNull(result);
    callback();
  });
});

assert.callback("T3 promiseRunner runAll with all success", (callback) => {
  const entries = [1, 2, 3, 4, 5];
  const execute = (entry) => {
    return new Promise((resolve) => {
      console.log(`T3 Running entry ${entry}`);
      resolve(entry);
    });
  };

  promiseRunner.runAll(entries, execute, (err, result) => {
    if (err) throw err;
    assert.notNull(result);
    callback();
  });
});

assert.callback("T4 promiseRunner runAll with over half success", (callback) => {
  const entries = [1, 2, 3, 4, 5];
  const execute = (entry) => {
    return new Promise((resolve, reject) => {
      if (entry >= 2) {
        console.log(`T4 Running entry ${entry} success`);
        return resolve(entry);
      }

      console.log(`T4 Running entry ${entry} fail`);
      reject();
    });
  };

  promiseRunner.runAll(entries, execute, (err, results) => {
    if (err) throw err;
    assert.notNull(results);

    console.log(`T4: ran ${results.length} success out of ${entries.length}`);
    callback();
  });
});

assert.callback("T5 promiseRunner runAll with under half success", (callback) => {
  const entries = [1, 2, 3, 4, 5];
  const execute = (entry) => {
    return new Promise((resolve, reject) => {
      if (entry >= 4) {
        console.log(`T5 Running entry ${entry} success`);
        return resolve(entry);
      }

      console.log(`T5 Running entry ${entry} fail`);
      reject();
    });
  };

  promiseRunner.runAll(entries, execute, (err) => {
    assert.notNull(err);
    callback();
  });
});
