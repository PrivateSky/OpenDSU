/*
    Security Context related functionalities

 */

const constants = require("../moduleConstants");
const openDSU = require("opendsu");
const config = openDSU.loadAPI("config")
const MainDSU = require("./lib/MainDSU");
const SecurityContext = require("./lib/SecurityContext");

const getVaultDomain = (callback) => {
    config.getEnv(constants.VAULT_DOMAIN, (err, vaultDomain) => {
        if (err || !vaultDomain) {
            console.log(`The property <${constants.DOMAIN}> is deprecated in environment.js. Use the property <${constants.VAULT_DOMAIN}> instead`)
            return config.getEnv(constants.DOMAIN, callback);
        }

        callback(undefined, vaultDomain);
    });
}

const getDIDDomain = (callback) => {
    config.getEnv(constants.DID_DOMAIN, callback);
}

const securityContextIsInitialised = () => {
    if (typeof $$.sc === "undefined") {
        return false;
    }

    return $$.sc.isInitialised();
}

const getSecurityContext = () => {
    if (typeof $$.sc === "undefined") {
        $$.sc = new SecurityContext();
    }

    return $$.sc;
};

const refreshSecurityContext = () => {
    $$.sc = new SecurityContext();
    return $$.sc;
};

const getMainEnclave = (callback) => {
    if (!$$.sc && !callback) {
        return;
    }
    const sc = getSecurityContext();
    if (sc.isInitialised()) {
        return sc.getMainEnclaveDB(callback);
    } else {
        sc.on("initialised", () => {
            sc.getMainEnclaveDB(callback);
        });
    }
}

const getSharedEnclave = (callback) => {
    const sc = getSecurityContext();
    if (sc.isInitialised()) {
        sc.getSharedEnclaveDB((err, sharedEnclave)=>{
            if (err) {
                return callback(err);
            }

            sharedEnclave.refresh(err => callback(err, sharedEnclave));
        });
    } else {
        sc.on("initialised", () => {
            sc.getSharedEnclaveDB(callback);
        });
    }
}

const sharedEnclaveExists = ()=>{
    const sc = getSecurityContext();
    return sc.sharedEnclaveExists();
}

const configEnvironment = (config, refreshSC, callback) => {
    if (typeof refreshSC === "function") {
        callback = refreshSC;
        refreshSC = true;
    }
    MainDSU.getMainDSU((err, mainDSU) => {
        if (err) {
            return callback(createOpenDSUErrorWrapper("Failed to get main DSU", err));
        }

        mainDSU.readFile(constants.ENVIRONMENT_PATH, (err, env) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper("Failed to read env", err));
            }

            try {
                env = JSON.parse(env.toString());
            } catch (e) {
                return callback(createOpenDSUErrorWrapper("Failed to parse env", e));
            }

            Object.assign(env, config);
            config = env;
            mainDSU.writeFile(constants.ENVIRONMENT_PATH, JSON.stringify(config), (err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper("Failed to write env", err));
                }

                if (refreshSC) {
                    const sc = refreshSecurityContext();
                    sc.on("initialised", () => callback(undefined, sc));
                } else {
                    const sc = getSecurityContext();
                    if (securityContextIsInitialised()) {
                        return callback(undefined, sc);
                    }

                    sc.on("initialised", () => {
                        callback(undefined, sc)
                    });
                }
            });
        })
    });
}

const setEnclave = (enclave, type, callback) => {
    const config = {};
    enclave.getDID((err, did) => {
        if (err) {
            return callback(err);
        }

        config[openDSU.constants[type].DID] = did;
        enclave.getKeySSI((err, keySSI) => {
            if (err) {
                return callback(err);
            }

            config[openDSU.constants[type].KEY_SSI] = keySSI;
            config[openDSU.constants[type].TYPE] = enclave.getEnclaveType();
            configEnvironment(config, callback);
        })
    })
}

const setMainEnclave = (enclave, callback) => {
    setEnclave(enclave, "MAIN_ENCLAVE", callback);
};

const setSharedEnclave = (enclave, callback) => {
    setEnclave(enclave, "SHARED_ENCLAVE", callback);
};

module.exports = {
    setMainDSU: MainDSU.setMainDSU,
    getMainDSU: MainDSU.getMainDSU,
    getVaultDomain,
    getSecurityContext,
    refreshSecurityContext,
    getDIDDomain,
    securityContextIsInitialised,
    getMainEnclave,
    setMainEnclave,
    getSharedEnclave,
    setSharedEnclave,
    configEnvironment,
    sharedEnclaveExists
};
