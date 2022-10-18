function PathKeyMapping(enclaveHandler) {
    //enclaveHandler.loadPaths
    //
    const openDSU = require("opendsu");
    const utils = openDSU.loadAPI("utils");
    let pathKeysMapping = {};

    const  init = async () => {
        pathKeysMapping = await $$.promisify(enclaveHandler.loadPaths)();
    }

    this.put = (pathKeySSI, callback)=>{

    }

    this.get = (pathKeySSI) => {

    };

    utils.bindAutoPendingFunctions(this);
}

module.exports = PathKeyMapping;