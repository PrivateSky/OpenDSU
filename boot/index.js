let { ENVIRONMENT_TYPES } = require("../moduleConstants.js");

function getBootScript() {
    switch ($$.environmentType) {
        case ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:
            return require("./WorkerBootScript");
        case ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
            return require("./NodeBootScript");
        default:
            throw new Error(`Current environment ${$$.environmentType} doesn't support opendsu boot script!`);
    }
}

module.exports = getBootScript();
