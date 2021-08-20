const config = {};
function set(key, value) {
    config[key] = value;
}

function get(key) {
    return config[key];
}

function setEnv() {
    //update environment.json
}

function getEnv() {

}

const autoconfigFromEnvironment = require("./autoConfigFromEnvironment");

function disableLocalVault(){
    const constants = require("../moduleConstants");
    set(constants.CACHE.VAULT_TYPE, constants.CACHE.NO_CACHE);
}

module.exports = {
    set,
    get,
    autoconfigFromEnvironment,
    disableLocalVault
};

