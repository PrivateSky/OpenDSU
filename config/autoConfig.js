const config = require("./index");
const constants = require("../moduleConstants");
const system = require("../system");
const getBaseURL = require("../utils/getBaseURL");
const errorModule = require("../error");

system.setEnvironmentVariable(constants.BDNS_ROOT_HOSTS, `${getBaseURL()}/bdns#x-blockchain-domain-request`);
switch ($$.environmentType) {
    case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
    case constants.ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:
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

setGlobalVariable("createOpenDSUErrorWrapper", errorModule.createOpenDSUErrorWrapper);
setGlobalVariable("OpenDSUSafeCallback", errorModule.OpenDSUSafeCallback);
setGlobalVariable("reportUserRelevantWarning", errorModule.reportUserRelevantWarning);
setGlobalVariable("reportUserRelevantInfo", errorModule.reportUserRelevantInfo);
setGlobalVariable("reportDevRelevantInfo", errorModule.reportDevRelevantInfo);
setGlobalVariable("reportUserRelevantError", errorModule.reportUserRelevantError);
setGlobalVariable("registerMandatoryCallback", errorModule.registerMandatoryCallback);
setGlobalVariable("printOpenDSUError", errorModule.printOpenDSUError);



