const constants = require("../moduleConstants");
const config = {};

function set(key, value) {
    config[key] = value;
}

function get(key) {
    return config[key];
}

function readEnvFile(callback) {
    const sc = require("opendsu").loadAPI("sc");
    sc.getMainDSU((err, mainDSU) => {
        if (err) {
            return callback(createOpenDSUErrorWrapper(`Failed to get main DSU`, err));
        }

        mainDSU.readFile(constants.ENVIRONMENT_PATH, (err, env) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get main DSU`, err));
            }

            try {
                env = JSON.parse(env.toString());
            } catch (e) {
                return callback(createOpenDSUErrorWrapper(`Failed parse env file`, e));
            }

            callback(undefined, env);
        });
    });
}

function writeEnvFile(env, callback) {
    const sc = require("opendsu").loadAPI("sc");
    sc.getMainDSU((err, mainDSU) => {
        if (err) {
            return callback(createOpenDSUErrorWrapper(`Failed to get main DSU`, err));
        }
        mainDSU.writeFile(constants.ENVIRONMENT_PATH, JSON.stringify(env), (err)=>{
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to write env`, err));
            }
            callback();
        });
    });
}


function setEnv(key, value, callback) {
    //update environment.json
    readEnvFile((err, env) => {
        if (err) {
            return callback(createOpenDSUErrorWrapper(`Failed to read env file`, err));
        }
        env[key] = value;
        writeEnvFile(env, callback);
    });
}

function getEnv(key, callback) {
    readEnvFile((err, env) => {
        if (err) {
            return callback(createOpenDSUErrorWrapper(`Failed to read env file`, err));
        }

        callback(undefined, env[key]);
    });
}

const autoconfigFromEnvironment = require("./autoConfigFromEnvironment");

function disableLocalVault() {
    set(constants.CACHE.VAULT_TYPE, constants.CACHE.NO_CACHE);
}

module.exports = {
    set,
    get,
    setEnv,
    getEnv,
    autoconfigFromEnvironment,
    disableLocalVault,
    readEnvFile
};

