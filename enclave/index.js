const MemoryEnclave = require("./impl/MemoryEnclave");

function initialiseWalletDBEnclave() {
    const WalletDBEnclave = require("./impl/WalletDBEnclave");
    return new WalletDBEnclave();
}

function initialiseMemoryEnclave() {
    const MemoryEnclave = require("./impl/MemoryEnclave");
    return new MemoryEnclave();
}

function initialiseAPIHUBProxy(adminDID) {
    const APIHUBProxy = require("./impl/APIHUBProxy");
    return new APIHUBProxy();}

function initialiseHighSecurityProxy(adminDID) {
    throw Error("Not implemented");
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
