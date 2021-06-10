function runSyncFunction({ apiSpaceName, functionName, params }) {
    const openDSU = require("opendsu");
    const api = openDSU.loadAPI(apiSpaceName);

    if (!api[functionName]) {
        throw Error(`function "${functionName}" does not exists in "${apiSpaceName}"!`)
    }

    return api[functionName].apply(undefined, params);
}

module.exports = {
    runSyncFunction
}