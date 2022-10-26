function PathKeyMapping(enclaveHandler) {
    const utils = require("./utils");
    const openDSU = require("opendsu");
    const utilsAPI = openDSU.loadAPI("utils");
    const keySSISpace = openDSU.loadAPI("keyssi");
    let pathKeysMapping = {};
    let initialised = false;
    const init = async () => {
        let paths = await $$.promisify(enclaveHandler.loadPaths)();
        pathKeysMapping = await $$.promisify(utils.getKeySSIsMappingFromPathKeys)(paths);

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
                try {
                    const derivedKeySSIs = await $$.promisify(utils.getKeySSIMapping)(pathKeySSI);
                    pathKeysMapping = {...pathKeysMapping, ...derivedKeySSIs};
                    callback();
                } catch (e) {
                    callback(e);
                }
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
        let capableOfSigningKeySSI
        try {
            capableOfSigningKeySSI = pathKeysMapping[openDSU.constants.KEY_SSIS.SEED_SSI][keySSI];
        } catch (e) {
            return callback(e);
        }

        if (typeof capableOfSigningKeySSI === "undefined") {
            return callback(Error("Could not get a keySSI that can sign."));
        }

        callback(undefined, capableOfSigningKeySSI);
    };

    this.getReadForKeySSI = (keySSI, callback) => {
        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(e);
            }
        }
        keySSI = keySSI.getIdentifier();
        let readKeySSI
        try {
            readKeySSI = pathKeysMapping[openDSU.constants.KEY_SSIS.SREAD_SSI][keySSI];
        } catch (e) {
            return callback(e);
        }

        if (typeof readKeySSI === "undefined") {
            return callback(Error("Could not get a keySSI with read access."));
        }

        callback(undefined, readKeySSI);
    }

    utilsAPI.bindAutoPendingFunctions(this);
    init();
}

module.exports = PathKeyMapping;