function PathKeyMapping(enclaveHandler) {
    const utils = require("./utils");
    const openDSU = require("opendsu");
    const utilsAPI = openDSU.loadAPI("utils");
    const keySSISpace = openDSU.loadAPI("keyssi");
    let pathKeysMapping = {};
    let initialised = false;
    const init = async () => {
        pathKeysMapping = await $$.promisify(enclaveHandler.loadPaths)();
        this.finishInitialisation();
    };

    this.isInitialised = () => {
        return initialised;
    };

    this.storePathKeySSI = (pathKeySSI, callback) => {
        if (typeof pathKeySSI === "string") {
            try {
                pathKeySSI = keySSISpace.parse(pathKeySSI);
            } catch (e) {
                return callback(e);
            }
        }
        pathKeySSI = pathKeySSI.getIdentifier();

        const storePathKeySSI = () => {
            enclaveHandler.storePathKeySSI(pathKeySSI, async err => {
                if (err) {
                    return callback(err);
                }
                const derivedKeySSIs = await utils.getAllDerivedSSIsForKeySSI(pathKeySSI);
                pathKeysMapping = {...pathKeysMapping, ...derivedKeySSIs};
                console.log(pathKeysMapping);
                callback();
            });
        }
        storePathKeySSI();
    };

    this.getCapableOfSigningKeySSI = (keySSI, callback) => {
        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(e);
            }
        }
        keySSI = keySSI.getIdentifier();
        callback(pathKeysMapping[keySSI]);
    };

    utilsAPI.bindAutoPendingFunctions(this);
    init();
}

module.exports = PathKeyMapping;