const arrayUtils = require("./array");

function runAll(listEntries, executeEntry, callback) {
  const allExecutions = listEntries.map((entry) => {
    return executeEntry(entry)
      .then((result) => {
        return {
          success: true,
          result,
        };
      })
      .catch((error) => {
        return {
          error,
        };
      });
  });
  Promise.all(allExecutions)
    .then((results) => {
      const successExecutions = results.filter((run) => run.success);

      const isConsideredSuccessfulRun = successExecutions.length >= Math.ceil(allExecutions.length / 2);
      if (isConsideredSuccessfulRun) {
        const successExecutionResults = successExecutions.map((run) => run.result);
        return callback(null, successExecutionResults);
      }


      return callback("FAILED");
    })
    .catch((error) => callback(error));
}

function runOne(listEntries, executeEntry, callback) {
  if (!listEntries.length) {
    return callback("EMPTY_LIST");
  }

  availableListEntries = [...listEntries];
  arrayUtils.shuffle(availableListEntries);

  const entry = availableListEntries.shift();

  const executeForSingleEntry = (entry) => {
    return executeEntry(entry)
      .then((result) => {
        return callback(null, result);
      })
      .catch((err) => {
        if (!availableListEntries.length) {
          return callback(err);
        }

        const nextEntry = availableListEntries.shift();
        executeForSingleEntry(nextEntry);
      });
  };

  executeForSingleEntry(entry);
}

module.exports = {
  runAll,
  runOne,
};
