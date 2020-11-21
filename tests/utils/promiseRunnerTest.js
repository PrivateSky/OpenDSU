require("../../../../psknode/bundles/testsRuntime");
const assert = require("double-check").assert;

const promiseRunner = require("../../utils/promise-runner");

assert.callback("T1 promiseRunner runOneSuccessful success", (callback) => {
  const entries = [1, 2, 3, 4, 5];
  const execute = (entry) => {
    return new Promise((resolve) => {
      console.log(`T1 Running entry ${entry}`);
      resolve(entry);
    });
  };

  promiseRunner.runOneSuccessful(entries, execute, (err, result) => {
    if (err) throw err;
    assert.notNull(result);
    callback();
  });
});

assert.callback("T2 promiseRunner runOneSuccessful success with first fail", (callback) => {
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

  promiseRunner.runOneSuccessful(entries, execute, (err, result) => {
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

  promiseRunner.runAll(entries, execute, null, (err, result) => {
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

  promiseRunner.runAll(entries, execute, null, (err, results) => {
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

  promiseRunner.runAll(entries, execute, null, (err) => {
    assert.notNull(err);
    callback();
  });
});

assert.callback("T6 promiseRunner runEnoughForMajority with all success and default configs", (callback) => {
  const entries = [1, 2, 3, 4, 5];
  const execute = (entry) => {
    return new Promise((resolve) => {
      console.log(`T6 Running entry ${entry}`);
      resolve(entry);
    });
  };

  promiseRunner.runEnoughForMajority(entries, execute, null, null, (err, result) => {
    if (err) throw err;
    assert.notNull(result);
    callback();
  });
});

assert.callback("T7 promiseRunner runEnoughForMajority with first fail and default configs", (callback) => {
  const entries = [1, 2, 3, 4, 5];
  const execute = (entry) => {
    return new Promise((resolve, reject) => {
      console.log(`T7 Running entry ${entry}`);
      setTimeout(() => {
        if (entry === 1) return reject();
        resolve(entry);
      }, 500);
    });
  };

  promiseRunner.runEnoughForMajority(entries, execute, null, null, (err, result) => {
    if (err) throw err;
    assert.notNull(result);
    callback();
  });
}, 10000);

assert.callback("T8 promiseRunner runEnoughForMajority with fails and custom validateResults", (callback) => {
  const entries = [1, 2, 3, 4, 5];
  const execute = (entry) => {
    return new Promise((resolve, reject) => {
      console.log(`T8 Running entry ${entry}`);
      setTimeout(() => {
        if (entry === 1) return reject();
        resolve(entry);
      }, 500);
    });
  };

  const validateResults = (successResults, errorResults, totalCount) => {
    // force to run all the executions
    return successResults.length + errorResults.length === totalCount;
  };

  promiseRunner.runEnoughForMajority(entries, execute, null, validateResults, (err, result) => {
    if (err) {
      console.log("T8", err);
      throw err;
    }
    assert.notNull(result);
    callback();
  });
}, 10000);

assert.callback("T9 promiseRunner runEnoughForMajority with fails and custom validateResults starting with 1 in parallel", (callback) => {
  const entries = [1, 2, 3, 4, 5];
  const execute = (entry) => {
    return new Promise((resolve, reject) => {
      console.log(`T9 Running entry ${entry}`);
      setTimeout(() => {
        if (entry === 1) return reject();
        resolve(entry);
      }, 300);
    });
  };

  const validateResults = (successResults, errorResults, totalCount) => {
    // force to run all the executions
    return successResults.length + errorResults.length === totalCount;
  };

  promiseRunner.runEnoughForMajority(entries, execute, 1, validateResults, (err, result) => {
    if (err) {
      console.log("T9", err);
      throw err;
    }
    assert.notNull(result);
    callback();
  });
}, 10000);
