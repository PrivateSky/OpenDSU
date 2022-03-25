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
            }

            writableDSU = wallet.getWritableDSU();
            __ensureEnvIsInitialised(writableDSU, callback);
        })
    }

    this.ensureSharedEnclaveExists = (callback) => {
        writableDSU.readFile("/environment.json", async (err, env) => {
            if (err) {
                return callback(err);
            }

            try {
                env = JSON.parse(env.toString());
            } catch (e) {
                return callback(e);
            }

            if (typeof env[openDSU.constants.SHARED_ENCLAVE.KEY_SSI] === "undefined") {
                const sharedEnclave = enclaveAPI.initialiseWalletDBEnclave();
                sharedEnclave.on("initialised", async () => {
                    try {
                        await $$.promisify(scAPI.setSharedEnclave)(sharedEnclave);
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

    this.writeFile = (path, data, callback) => {
        writableDSU.writeFile(path, data, callback);
    }

    this.readFile = (path, callback) => {
        writableDSU.readFile(path, callback);
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
        buildWallet.ensureSharedEnclaveExists(callback);
    });
}

module.exports = {
    initialiseWallet
};