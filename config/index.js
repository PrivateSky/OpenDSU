const config = {};

function set(key, value) {
    config[key] = value;
}

function get(key) {
    return config[key];
}

const constants = require("../moduleConstants");
switch ($$.environmentType){
    case constants.ENVIRONMENT.SERVICE_WORKER_ENVIRONMENT_TYPE:
    case constants.ENVIRONMENT.BROWSER_ENVIRONMENT_TYPE:
        set(constants.CACHE.VAULT_TYPE, constants.CACHE.INDEXED_DB);
        break;
    case constants.ENVIRONMENT.NODEJS_ENVIRONMENT_TYPE:
        set(constants.CACHE.VAULT_TYPE, constants.CACHE.FS);
        break;
    default:
}

set(constants.CACHE.BASE_FOLDER_CONFIG_PROPERTY, constants.CACHE.BASE_FOLDER);
module.exports = {
    set,
    get
};

