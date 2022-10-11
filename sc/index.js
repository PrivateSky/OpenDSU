/*
    Security Context related functionalities

 */

    const constants = require("../moduleConstants");
    const openDSU = require("opendsu");
    const config = openDSU.loadAPI("config")
    const crypto = openDSU.loadAPI("crypto")
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
    
    const refreshSecurityContext = (pin) => {
        $$.sc = new SecurityContext(undefined, pin);
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
            sc.getSharedEnclaveDB(callback);
        } else {
            sc.on("initialised", () => {
                sc.getSharedEnclaveDB(callback);
            });
        }
    }
    
    const sharedEnclaveExists = () => {
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
    
            mainDSU.writeFile(constants.ENVIRONMENT_PATH, JSON.stringify(config), (err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper("Failed to write env", err));
                }
    
                if (refreshSC) {
                    const pin = getSecurityContext().getPaddedPIN();
                    const sc = refreshSecurityContext(pin);
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
        });
    }
    
    const setEnclave = (enclave, type, callback) => {
        config.readEnvFile((err, config) => {
            if (err) {
                return callback(err);
            }
            enclave.getDID((err, did) => {
                if (err) {
                    return callback(err);
                }
    
                config[openDSU.constants[type].DID] = did;
                enclave.getKeySSI((err, keySSI) => {
                    if (err) {
                        return callback(err);
                    }
    
                    setEnclaveKeySSI(type, keySSI, config);
    
                    config[openDSU.constants[type].TYPE] = enclave.getEnclaveType();
                    configEnvironment(config, callback);
    
                })
            })
        })
    }
    
    const setEnclaveKeySSI = (type, keySSI, config) => {
        const sc = getSecurityContext();
        const pin = sc.getPaddedPIN();
    
        if (type != "SHARED_ENCLAVE" || pin == undefined) {
            config[openDSU.constants[type].KEY_SSI] = keySSI;
            return;
        }
    
        const decodedBase58 = crypto.decodeBase58(keySSI);
        const encryptedKey = crypto.encrypt(decodedBase58, pin)
        const base58EncryptedKey = crypto.encodeBase58(encryptedKey);
        config[openDSU.constants[type].KEY_SSI] = base58EncryptedKey;
    
    }
    
    const deleteEnclave = (type, callback) => {
        config.readEnvFile((err, env) => {
            if (err) {
                return callback(err);
            }
    
            delete env[openDSU.constants[type].DID];
            delete env[openDSU.constants[type].KEY_SSI];
            delete env[openDSU.constants[type].TYPE];
            configEnvironment(env, callback);
        })
    }
    
    const deleteSharedEnclave = (callback) => {
        deleteEnclave("SHARED_ENCLAVE", callback);
    }
    
    const setMainEnclave = (enclave, callback) => {
        setEnclave(enclave, "MAIN_ENCLAVE", callback);
    };
    
    const setSharedEnclave = (enclave, callback) => {
        setEnclave(enclave, "SHARED_ENCLAVE", callback);
    };
    
    const setPIN = (pin) => {
        const sc = getSecurityContext();
        sc.setPIN(pin);
    }

    const isPINNeeded = async () => {
        const sc = getSecurityContext();
        return await sc.isPINNeeded();
    }
    
    
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
        setEnclave,
        deleteSharedEnclave,
        configEnvironment,
        sharedEnclaveExists,
        setPIN,
        setEnclaveKeySSI,
        isPINNeeded
    };
    