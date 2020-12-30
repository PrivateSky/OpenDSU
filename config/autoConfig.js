const config = require("./index");
const constants = require("../moduleConstants");
const system = require("../system");
const getBaseURL = require("../utils/getBaseURL");
const errorModule = require("../error");

system.setEnvironmentVariable(constants.BDNS_ROOT_HOSTS, `${getBaseURL()}/bdns#x-blockchain-domain-request`);
switch ($$.environmentType) {
    case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
        config.set(constants.CACHE.VAULT_TYPE, constants.CACHE.INDEXED_DB);
        break;
    case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
        config.set(constants.CACHE.VAULT_TYPE, constants.CACHE.INDEXED_DB);
        break;
    case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
        config.set(constants.CACHE.VAULT_TYPE, constants.CACHE.NO_CACHE);
        break;

    default:
}

config.set(constants.CACHE.BASE_FOLDER_CONFIG_PROPERTY, constants.CACHE.BASE_FOLDER);

switch ($$.environmentType) {
    case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
        if (typeof self !== "undefined") {
            self.createOpenDSUErrorWrapper          = errorModule.createErrorWrapper;
            self.OpenDSUSafeCallback                 = errorModule.OpenDSUSafeCallback;
            self.reportUserRelevantWarning          = errorModule.reportUserRelevantWarning;
            self.reportUserRelevantError            = errorModule.reportUserRelevantError;
        }
        break;
    case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
        if (typeof window !== "undefined") {
            window.createOpenDSUErrorWrapper        = errorModule.createErrorWrapper;
            window.OpenDSUSafeCallback              = errorModule.OpenDSUSafeCallback;
            window.reportUserRelevantWarning        = errorModule.reportUserRelevantWarning;
            window.reportUserRelevantError          = errorModule.reportUserRelevantError;
        }
        break;
    case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
    default:
        if (typeof global !== "undefined") {
            global.createOpenDSUErrorWrapper        = errorModule.createErrorWrapper;
            global.OpenDSUSafeCallback              = errorModule.OpenDSUSafeCallback;
            global.reportUserRelevantWarning        = errorModule.reportUserRelevantWarning;
            global.reportUserRelevantError          = errorModule.reportUserRelevantError;
        }
}

