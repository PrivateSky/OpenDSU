/*
    A collection of Secret Smart Contracts that can be used by the OpenDSU users
*/

function getSingleOWnerSecretSmartContract(){
    return new require("./SingleOwner")();
}

module.exports = {
    getSingleOWnerSecretSmartContract
}