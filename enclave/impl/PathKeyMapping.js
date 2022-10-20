function PathKeyMapping(enclaveHandler) {
    //enclaveHandler.loadPaths
    //
    const openDSU = require("opendsu");
    const utils = openDSU.loadAPI("utils");
    const keySSISpace = openDSU.loadAPI("keyssi");
    let pathKeysMapping = {};

    const init = async () => {
        pathKeysMapping = await $$.promisify(enclaveHandler.loadPaths)();
    };

    this.storePathKeySSI = (pathKeySSI, callback)=>{
        if (typeof pathKeySSI === "string") {
            try{

            }catch (e) {
                return callback(e);
            }
            pathKeySSI = pathKeySSI.getIdentifier();
        }

        enclaveHandler.storePathKeySSI(pathKeySSI)
    }

    this.getCapableOfSigningKeySSI = (pathKeySSI) => {

    };

    utils.bindAutoPendingFunctions(this);
}

module.exports = PathKeyMapping;