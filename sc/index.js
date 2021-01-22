/*
    Security Context related functionalities

 */

const getMainDSU = () => {

    if (!globalVariableExists("rawDossier")) {
        throw Error("Main DSU does not exist in the current context.");
    }
    return getGlobalVariable("rawDossier");
};

const setMainDSU = (mainDSU) => {
    return setGlobalVariable("rawDossier", mainDSU);
};

const keySSIs = {};

const registerKeySSI = (keySSI) => {
    if (typeof keySSI === "undefined") {
        throw Error(`A SeedSSI should be specified.`)
    }

    if (typeof keySSI === "string") {
        const keySSISpace = require("../keyssi");
        keySSI = keySSISpace.parse(keySSI);
    }

    console.log("Registering key ssi ....,......", keySSI.getIdentifier(true));
    let derivedKeySSI = keySSI;
    function registerDerivedKeySSIs(derivedKeySSI){
        try{
            derivedKeySSI = derivedKeySSI.derive();
            keySSIs[derivedKeySSI.getIdentifier()] = keySSI;
        }catch (e) {
            return;
        }
        registerDerivedKeySSIs(derivedKeySSI);
    }

    return registerDerivedKeySSIs(derivedKeySSI);
};

const getKeySSI = (keySSI) => {
    if (typeof keySSI === "undefined") {
        throw Error(`A KeySSI should be specified.`)
    }

    if (typeof keySSI !== "string") {
        keySSI = keySSI.getIdentifier();
    }

    return keySSIs[keySSI];
};

const sign = (keySSI, data, callback)=>{

}

const verify = (keySSI, data, callback)=>{

}

const encrypt = (keySSI, data, callback) => {

};

const decrypt = (keySSI, data, callback) => {

};

module.exports = {
    getMainDSU,
    setMainDSU,
    registerKeySSI,
    getKeySSI,
    sign,
    verify,
    encrypt,
    decrypt
}