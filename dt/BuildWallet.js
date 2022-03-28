const openDSU = require("opendsu");
const resolver = openDSU.loadAPI("resolver");
const keySSISpace = openDSU.loadAPI("keyssi");
const scAPI = openDSU.loadAPI("sc");
const enclaveAPI = openDSU.loadAPI("enclave");

function BuildWallet() {
    const secret = process.env.BUILD_SECRET_KEY || "nosecretfordevelopers";
    const vaultDomain = process.env.VAULT_DOMAIN || "vault";

    let writableDSU;

    const __ensureEnvIsInitialised = (writableDSU, callback) => {
        writableDSU.readFile("/environment.json", async (err, env) => {
            if (err) {
                try {
                    await $$.promisify(writableDSU.writeFile)("/environment.json", JSON.stringify({
                        vaultDomain: vaultDomain,
                        didDomain: vaultDomain
                    }))
                } catch (e) {
                    return callback(e);
                }
            }

            callback();
        });
    }

    this.initialise = (callback) => {
        const walletSSI = keySSISpace.createTemplateWalletSSI(vaultDomain, secret);
        resolver.loadDSU(walletSSI, async (err, wallet) => {
            if (err) {
                let seedSSI;
                try {
                    seedSSI = await $$.promisify(keySSISpace.createSeedSSI)(vaultDomain)
                } catch (e) {
                    return callback(e);
                }
                try {
                    wallet = await $$.promisify(resolver.createDSUForExistingSSI)(walletSSI, {dsuTypeSSI: seedSSI});
                } catch (e) {
                    return callback(e);
                }

                writableDSU = wallet.getWritableDSU();
                for (let prop in writableDSU) {
                    this[prop] = writableDSU[prop];
                }
            }

            writableDSU = wallet.getWritableDSU();
            __ensureEnvIsInitialised(writableDSU, callback);
        })
    }

    const ensureEnclaveExists = (enclaveType, callback) => {
        writableDSU.readFile("/environment.json", async (err, env) => {
            if (err) {
                return callback(err);
            }

            try {
                env = JSON.parse(env.toString());
            } catch (e) {
                return callback(e);
            }

            if (typeof env[openDSU.constants[enclaveType].KEY_SSI] === "undefined") {
                let seedDSU;
                try {
                    seedDSU = await $$.promisify(resolver.createSeedDSU)(vaultDomain);
                } catch (e) {
                    return callback(e);
                }

                let keySSI;
                try {
                    keySSI = await $$.promisify(seedDSU.getKeySSIAsString)();
                } catch (e) {
                    return callback(e);
                }
                const enclave = enclaveAPI.initialiseWalletDBEnclave(keySSI);
                enclave.on("initialised", async () => {
                    try {
                        await $$.promisify(scAPI.setEnclave)(enclave, enclaveType);
                        callback();
                    } catch (e) {
                        callback(createOpenDSUErrorWrapper("Failed to set shared enclave", e));
                    }
                })
            } else {
                callback();
            }
        });
    }

    this.ensureMainEnclaveExists = (callback) => {
        ensureEnclaveExists("MAIN_ENCLAVE", callback);
    }
    this.ensureSharedEnclaveExists = (callback) => {
        ensureEnclaveExists("SHARED_ENCLAVE", callback);
    }
}

const initialiseWallet = (callback) => {
    const scAPI = require("opendsu").loadAPI("sc");
    const buildWallet = new BuildWallet();
    buildWallet.initialise(err => {
        if (err) {
            return callback(err);
        }

        scAPI.setMainDSU(buildWallet);
        buildWallet.ensureMainEnclaveExists(err => {
            if (err) {
                return callback(err);
            }
            buildWallet.ensureSharedEnclaveExists(callback);
        })
    });
}

module.exports = {
    initialiseWallet
};