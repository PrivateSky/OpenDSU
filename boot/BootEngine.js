function BootEngine(getKeySSI) {
    if (typeof getKeySSI !== "function") {
        throw new Error("getSeed missing or not a function");
    }
    getKeySSI = promisify(getKeySSI);

    const openDSU = require("opendsu");
    const { constants } = openDSU;
    const resolver = openDSU.loadApi("resolver");
    const pskPath = require("swarmutils").path;

    const evalBundles = async (bundles, ignore) => {
        const listFiles = promisify(this.rawDossier.listFiles);
        const readFile = promisify(this.rawDossier.readFile);

        let fileList = await listFiles(constants.CONSTITUTION_FOLDER);
        fileList = bundles
            .filter((bundle) => fileList.includes(bundle) || fileList.includes(`/${bundle}`))
            .map((bundle) => pskPath.join(constants.CONSTITUTION_FOLDER, bundle));

        if (fileList.length !== bundles.length) {
            const message = `Some bundles missing. Expected to have ${JSON.stringify(
                bundles
            )} but got only ${JSON.stringify(fileList)}`;
            if (!ignore) {
                throw new Error(message);
            } else {
                console.log(message);
            }
        }

        for (let i = 0; i < fileList.length; i++) {
            var fileContent = await readFile(fileList[i]);
            try {
                eval(fileContent.toString());
            } catch (e) {
                console.log("Failed to eval file", fileList[i], e);
            }
        }
    };

    this.boot = function (callback) {
        const __boot = async () => {
            const keySSI = await getKeySSI();
            const loadRawDossier = promisify(resolver.loadDSU);
            try {
                this.rawDossier = await loadRawDossier(keySSI);
                global.rawDossier = this.rawDossier;
            } catch (err) {
                console.log(err);
                return callback(err);
            }

            const listFiles = promisify(this.rawDossier.listFiles);
            const readFile = promisify(this.rawDossier.readFile);

            let isBootFilePresent;
            let bootConfig;
            try {
                let allFiles = await listFiles(constants.CODE_FOLDER);
                console.log("allFiles", allFiles);
                isBootFilePresent = allFiles.some((file) => file === constants.BOOT_CONFIG_FILE);
                if (isBootFilePresent) {
                    const bootConfigFile = `${constants.CODE_FOLDER}/${constants.BOOT_CONFIG_FILE}`;
                    let bootConfigfileContent = await readFile(bootConfigFile);
                    bootConfig = JSON.parse(bootConfigfileContent.toString());
                }
            } catch (error) {
                console.error("Cannot check boot config file", error);
                return callback(error);
            }

            if (!isBootFilePresent || !bootConfig) {
                return;
            }

            const { runtimeBundles, constitutionBundles } = bootConfig;

            if (typeof runtimeBundles !== "undefined" && !Array.isArray(runtimeBundles)) {
                return callback(new Error("runtimeBundles is not array"));
            }

            if (typeof constitutionBundles !== "undefined" && !Array.isArray(constitutionBundles)) {
                return callback(new Error("constitutionBundles is not array"));
            }

            try {
                await evalBundles(runtimeBundles);
            } catch (err) {
                if (err.type !== "PSKIgnorableError") {
                    console.log(err);
                    return callback(err);
                }
            }

            if (typeof constitutionBundles !== "undefined") {
                try {
                    await evalBundles(constitutionBundles, true);
                } catch (err) {
                    console.log(err);
                    return callback(err);
                }
            }
        };

        __boot()
            .then(() => callback(undefined, this.rawDossier))
            .catch(callback);
    };
}

function promisify(fn) {
    return function (...args) {
        return new Promise((resolve, reject) => {
            fn(...args, (err, ...res) => {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    resolve(...res);
                }
            });
        });
    };
}

module.exports = BootEngine;
