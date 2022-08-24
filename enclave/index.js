const constants = require("../moduleConstants");

function initialiseWalletDBEnclave(keySSI, did) {
    const WalletDBEnclave = require("./impl/WalletDBEnclave");
    return new WalletDBEnclave(keySSI);
}

function initialiseMemoryEnclave() {
    const MemoryEnclave = require("./impl/MemoryEnclave");
    return new MemoryEnclave();
}

function initialiseAPIHUBProxy(domain, did) {
    const APIHUBProxy = require("./impl/APIHUBProxy");
    return new APIHUBProxy(domain, did);}

function initialiseHighSecurityProxy(domain, did) {
    const HighSecurityProxy = require("./impl/HighSecurityProxy");
    return new HighSecurityProxy(domain, did)
}

function connectEnclave(forDID, enclaveDID, ...args) {
    throw Error("Not implemented");
}

const enclaveConstructors = {};
function createEnclave(enclaveType, ...args) {
    if (typeof enclaveConstructors[enclaveType] !== "function") {
        throw Error(`No constructor function registered for enclave type ${enclaveType}`);
    }

    return enclaveConstructors[enclaveType](...args);
}

function registerEnclave(enclaveType, enclaveConstructor) {
    if (typeof enclaveConstructors[enclaveType] !== "undefined") {
        throw Error(`A constructor function already registered for enclave type ${enclaveType}`);
    }
    enclaveConstructors[enclaveType] = enclaveConstructor;
}

registerEnclave(constants.ENCLAVE_TYPES.MEMORY_ENCLAVE, initialiseMemoryEnclave);
registerEnclave(constants.ENCLAVE_TYPES.WALLET_DB_ENCLAVE, initialiseWalletDBEnclave);
registerEnclave(constants.ENCLAVE_TYPES.APIHUB_ENCLAVE, initialiseAPIHUBProxy);
registerEnclave(constants.ENCLAVE_TYPES.HIGH_SECURITY_ENCLAVE, initialiseHighSecurityProxy);

module.exports = {
    initialiseWalletDBEnclave,
    initialiseMemoryEnclave,
    initialiseAPIHUBProxy,
    initialiseHighSecurityProxy,
    connectEnclave,
    createEnclave,
    registerEnclave,
    EnclaveMixin: require("./impl/Enclave_Mixin"),
    ProxyMixin: require("./impl/ProxyMixin")
}
