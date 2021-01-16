const arrayUtils = require("./array");

function validateMajorityRunAllWithSuccess(successResults, errorResults, totalCount) {
  const successCount = successResults.length;
  const errorCount = errorResults.length;

  if (totalCount == null) {
    // totalCount was not provided, so we consider to be the sum of the other results
    totalCount = successCount + errorCount;
  }

  const isMajorityWithSuccess = successCount >= Math.ceil(totalCount / 2);
  return isMajorityWithSuccess;
}

function runSinglePromise(executePromise, promiseInput) {
  return executePromise(promiseInput)
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
}

function runAll(listEntries, executeEntry, validateResults, callback, debugInfo) {
  if (typeof validateResults !== "function") {
    validateResults = validateMajorityRunAllWithSuccess;
  }

  const allInitialExecutions = listEntries.map((entry) => {
    return runSinglePromise(executeEntry, entry);
  });
  Promise.all(allInitialExecutions)
    .then((results) => {
      const successExecutions = results.filter((run) => run.success);
      const errorExecutions = results.filter((run) => !run.success);

      const isConsideredSuccessfulRun = validateResults(successExecutions, errorExecutions);
      if (isConsideredSuccessfulRun) {
        const successExecutionResults = successExecutions.map((run) => run.result);
        return callback(null, successExecutionResults);
      }

      let baseError = debugInfo;
      if(errorExecutions.length){
        if(baseError){
          baseError = createOpenDSUErrorWrapper("Error found during runAll", errorExecutions[0], debugInfo);
        }
      }
      return callback(createOpenDSUErrorWrapper("FAILED to runAll " , baseError));
    })
    .catch(( error) => {
      callback(error)
    });
}

function runOneSuccessful(listEntries, executeEntry, callback, debugInfo) {
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
          return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to execute entry`, err));
        }

        const nextEntry = availableListEntries.shift();
        executeForSingleEntry(nextEntry);
      });
  };

  executeForSingleEntry(entry);
}

function runEnoughForMajority(listEntries, executeEntry, initialRunCount, validateResults, callback, debugInfo) {
  const totalCount = listEntries.length;

  if (!initialRunCount || typeof initialRunCount !== "number") {
    // no initiaRunCount was specified, so we execute half of them initially
    initialRunCount = Math.ceil(totalCount / 2);
  }
  initialRunCount = Math.min(initialRunCount, totalCount);

  if (typeof validateResults !== "function") {
    validateResults = validateMajorityRunAllWithSuccess;
  }

  let allExecutedRunResults = [];
  const initialEntries = listEntries.slice(0, initialRunCount);
  const remainingEntries = listEntries.slice(initialRunCount);

  const checkAllExecutedRunResults = () => {
    const successExecutions = allExecutedRunResults.filter((run) => run.success);
    const errorExecutions = allExecutedRunResults.filter((run) => !run.success);

    const isConsideredSuccessfulRun = validateResults(successExecutions, errorExecutions, totalCount);
    if (isConsideredSuccessfulRun) {
      const successExecutionResults = successExecutions.map((run) => run.result);
      return callback(null, successExecutionResults);
    }

    if (!remainingEntries.length) {
      // the results weren't validated, but we don't have any other entry to run
      return callback(new Error("FAILED to run enough in majority"+debugInfo));
    }

    const nextEntry = remainingEntries.shift();
    runSinglePromise(executeEntry, nextEntry)
      .then((nextEntryResult) => {
        allExecutedRunResults.push(nextEntryResult);
        checkAllExecutedRunResults();
      })
      .catch(() => {
        // runSinglePromise already makes sure no catch is thrown
        // put to ignore nodejs unhandled execution warning
      });
  };

  const allInitialExecutions = initialEntries.map((entry) => {
    return runSinglePromise(executeEntry, entry);
  });

  Promise.all(allInitialExecutions)
    .then((results) => {
      allExecutedRunResults = results;
      checkAllExecutedRunResults();
    })
    .catch((error) => callback(error));
}

module.exports = {
  runAll,
  runOneSuccessful,
  runEnoughForMajority,
};
