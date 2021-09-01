const WalletDBEnclave = require("./impl/WalletDBEnclave");

function initialiseWalletDBEnclave(){
    const WalletDBEnclave = require("./impl/WalletDBEnclave");
    return new WalletDBEnclave();
}

function initialiseMemoryEnclave(){
    const MemoryEnclave = require("./impl/MemoryEnclave");
    return new MemoryEnclave();
}

function initialiseAPIHUBEnclave(adminDID) {
    throw Error("Not implemented");
}


function initialiseHighSecurityEnclave(adminDID){
    throw Error("Not implemented");
}

function connectEnclave(forDID, enclaveDID, ...args){
    throw Error("Not implemented");
}

module.exports = {
    initialiseWalletDBEnclave,
    initialiseMemoryEnclave,
    initialiseAPIHUBEnclave,
    initialiseHighSecurityEnclave,
    connectEnclave
}
