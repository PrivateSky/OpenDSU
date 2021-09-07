const MemoryEnclave = require("./impl/MemoryEnclave");
const APIHUBProxy = require("./impl/APIHUBProxy");

function initialiseWalletDBEnclave() {
    const WalletDBEnclave = require("./impl/WalletDBEnclave");
    return new WalletDBEnclave();
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

module.exports = {
    initialiseWalletDBEnclave,
    initialiseMemoryEnclave,
    initialiseAPIHUBProxy,
    initialiseHighSecurityProxy,
    connectEnclave
}
