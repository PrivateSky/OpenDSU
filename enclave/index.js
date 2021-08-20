function initialiseWalletDBEnclave(){
    const WalletDBEnclave = require("./impl/WalletDBEnclave");
    return new WalletDBEnclave();
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
    initialiseWalletDBEnclave
}
