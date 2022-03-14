function NodeMainDSU() {
    const secret = process.env.BUILD_SECRET_KEY || "nosecretfordevelopers";
    const openDSU = require("opendsu");
    const resolver = openDSU.loadAPI("resolver");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const vaultDomain = process.env.VAULT_DOMAIN || "vault";

    const __ensureEnvIsInitialised = async (writableDSU) => {
        let env;
        try {
            env = await $$.promisify(writableDSU.readFile)("/environment.json");
        } catch (e) {
            await $$.promisify(writableDSU.writeFile)("/environment.json", JSON.stringify({
                vaultDomain: vaultDomain,
                didDomain: vaultDomain
            }))
        }
    }

    const ensureWalletIsCreated = (callback) => {
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

            const writableDSU = wallet.getWritableDSU();
            try {
                await __ensureEnvIsInitialised(writableDSU);
            } catch (e) {
                return callback(e);
            }

            callback(undefined, writableDSU);
        })
    }
    this.writeFile = (path, data, callback) => {
        ensureWalletIsCreated((err, writableDSU) => {
            if (err) {
                return callback(err);
            }

            writableDSU.writeFile(path, data, callback);
        })
    }

    this.readFile = (path, callback) => {
        ensureWalletIsCreated(async (err, writableDSU) => {
            if (err) {
                return callback(err);
            }

            let data;
            try {
                data = await $$.promisify(writableDSU.readFile)(path);
            } catch (e) {
                callback(e);
            }
            callback(undefined, data.toString());
        })
    }
}

module.exports = NodeMainDSU;