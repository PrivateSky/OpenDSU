const config = require("./index");
const constants = require("../moduleConstants");
const system = require("../system");
const getBaseURL = require("../utils/getBaseURL");
const createErrorWrapper = require("../error").createErrorWrapper;

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
            self.createOpenDSUErrorWrapper = createErrorWrapper;
        }
        break;
    case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
        if (typeof window !== "undefined") {
            window.createOpenDSUErrorWrapper = createErrorWrapper;
        }
        break;
    case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
    default:
        if (typeof global !== "undefined") {
            global.createOpenDSUErrorWrapper = createErrorWrapper;
        }
}

if($$.environmentType === constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE){
    try{
        require("../sc").getMainDSU().readFile("/environment.js", (err, envContent) => {
            if(err){
                console.trace("Failed reading enviroment.js", err);
            }
            try{
                let environment = eval(envContent.toString());
                require("./autoConfigFromEnvironment.js")(environment);
            } catch(err){
                console.trace("Failed evaling  enviroment.js", err);
            }
        })
    }catch(err){
        console.trace("Failed reading enviroment.js", err);
    }

}
