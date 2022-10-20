const pathModule = require("path");

const constants = require("./constants");

function WalletDBEnclaveHandler(walletDBEnclaveKeySSI, config) {
    const defaultConfig = {
        maxNoScatteredKeys: 5000
    }
    Object.assign(defaultConfig, config);
    config = defaultConfig;
    const openDSU = require("opendsu");
    const resolver = openDSU.loadAPI("resolver");
    const utils = openDSU.loadAPI("utils");
    let enclaveDSU;
    const init = async ()=>{
        try {
            enclaveDSU = await $$.promisify(resolver.loadDSU)(walletDBEnclaveKeySSI);
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to load enclave DSU`, e);
        }
    }

    this.storePathKeySSI = (pathKeySSI, callback) => {
        const filePath = pathModule.join(constants.PATHS.SCATTERED_PATH_KEYS, pathKeySSI.getSpecificString(), pathKeySSI.getIdentifier());
        storageDB.writeFile(filePath, async err => {
            if (err) {
                return callback(err);
            }

            try {
                const files = await $$.promisify(storageDB.listFiles)(constants.PATHS.SCATTERED_PATH_KEYS);
                if (files.length === config.maxNoScatteredKeys) {
                    await compactPathKeys();
                }
            }catch (e) {
                callback(e);
            }
        })
    };

    const compactPathKeys = async () => {
        let compactedContent = "";
        const crypto = require("opendsu").loadAPI("crypto");
        const files = $$.promisify(storageDB.listFiles)(constants.PATHS.SCATTERED_PATH_KEYS);

        for (let i = 0; i < files.length; i++) {
            const {key, value} = getKeyValueFromPath(files[i]);
            compactedContent = `${compactedContent}${key} ${value}\n`;
        }

        const fileName = crypto.encodeBase58(crypto.generateRandom("16"));
        await storageDB.writeFile(pathModule.join(constants.PATHS.COMPACTED_PATH_KEYS, fileName), compactedContent);

        for (let i = 0; i < files.length; i++) {
            const filePath = pathModule.join(constants.PATHS.SCATTERED_PATH_KEYS, files[i]);
            await $$.promisify(storageDB.delete)(filePath);
        }
    }

    const getKeyValueFromPath = (pth) => {
        const lastSegmentIndex = pth.lastIndexOf("/");
        const key = lastSegmentIndex.slice(0, lastSegmentIndex);
        const value = lastSegmentIndex.slice(lastSegmentIndex + 1);
        return {
            key, value
        }
    }

    this.loadPaths = (callback) => {
        loadCompactedPathKeys((err, compactedKeys) => {
            if (err) {
                return callback(err);
            }

            loadScatteredPathKeys(async (err, scatteredKeys) => {
                if (err) {
                    return callback(err);
                }

                try {
                    const keySSIsMap = await deriveAllKeySSIsFromPathKeys({...compactedKeys, ...scatteredKeys});
                    callback(undefined, keySSIsMap);
                } catch (e) {
                    callback(e);
                }
            })
        });
    }

    const deriveAllKeySSIsFromPathKeys = async (pathKeyMap) => {
        let keySSIMap = {};
        const openDSU = require("opendsu");
        const keySSISpace = openDSU.loadAPI("keyssi");
        for (let pth in pathKeyMap) {
            const pathSSIIdentifier = pathKeyMap[pth];
            let keySSI = keySSISpace.parse(pathSSIIdentifier);
            const derivedKeySSIs = await getAllDerivedSSIsForKeySSI(keySSI);
            keySSIMap = {...keySSIMap, ...derivedKeySSIs};
        }

        return keySSIMap;
    }

    const getAllDerivedSSIsForKeySSI = async (keySSI) => {
        const derivedKeySSIs = {};
        const keySSIIdentifier = keySSI.getIdentifier();
        const __getDerivedKeySSIRecursively = async (currentKeySSI) => {
            derivedKeySSIs[keySSIIdentifier] = currentKeySSI.getIdentifier();
            try {
                currentKeySSI = await $$.promisify(currentKeySSI.derive)();
            } catch (e) {
                return;
            }

            await __getDerivedKeySSIRecursively(currentKeySSI);
        }

        await __getDerivedKeySSIRecursively(keySSI);
        return derivedKeySSIs;
    }

    const loadScatteredPathKeys = (callback) => {
        const pathKeyMap = {};
        storageDB.listFiles(constants.PATHS.SCATTERED_PATH_KEYS, async (err, files) => {
            if (err) {
                return callback(err);
            }

            for (let i = 0; i < files.length; i++) {
                const {key, value} = getKeyValueFromPath(files[i]);
                pathKeyMap[key] = value;
            }

            callback(undefined, pathKeyMap);
        });
    }

    const loadCompactedPathKeys = (callback) => {
        let pathKeyMap = {};
        const compactedValuesLocation = constants.PATHS.COMPACTED_PATH_KEYS;
        storageDB.listFiles(compactedValuesLocation, async (err, files) => {
            if (err) {
                return callback(err);
            }

            try {
                for (let i = 0; i < files.length; i++) {
                    const filePath = pathModule.join(compactedValuesLocation, files[i]);
                    let compactedFileContent = storageDB.readFile(filePath);
                    compactedFileContent = compactedFileContent.toString();
                    const partialKeyMap = mapFileContent(compactedFileContent);
                    pathKeyMap = {...pathKeyMap, ...partialKeyMap};
                }
            } catch (e) {
                return callback(e);
            }


            callback(undefined, pathKeyMap);
        });
    }

    const mapFileContent = (fileContent) => {
        const pathKeyMap = {};
        const fileLines = fileContent.split("\n");
        for (let i = 0; i < fileLines.length; i++) {
            const splitLine = fileLines[i].split(" ");
            pathKeyMap[splitLine[0]] = splitLine[1];
        }

        return pathKeyMap;
    }

    init();
    utils.bindAutoPendingFunctions(this);
}

module.exports = WalletDBEnclaveHandler;