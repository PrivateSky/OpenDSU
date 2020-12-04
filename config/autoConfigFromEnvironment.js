
module.exports = function(environment){
        const config = require("./index.js");
        const constants = require("../moduleConstants");
        //const systemEnvirnoment = require("../system");

        if(environment[constants.LOADER_ENVIRONMENT_JSON.VAULT] === constants.LOADER_ENVIRONMENT_JSON.SERVER){
            config.set(constants.CACHE.VAULT_TYPE, constants.CACHE.NO_CACHE);
        }

        if(environment[constants.LOADER_ENVIRONMENT_JSON.AGENT] === constants.LOADER_ENVIRONMENT_JSON.MOBILE){
            config.set(constants.CACHE.VAULT_TYPE, constants.CACHE.NO_CACHE);
            //systemEnvirnoment.setEnvironmentVariable(constants.BDNS_ROOT_HOSTS,
        }
        console.log("Environment for vault", environment.appName,  config.get(constants.CACHE.VAULT_TYPE))
}