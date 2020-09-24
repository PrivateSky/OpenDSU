const KeySSIResolver = require("key-ssi-resolver");
const keySSISpace = require("opendsu").loadApi("keyssi");

const initializeResolver = (options) => {
    options = options || {};
    return KeySSIResolver.initialize(options);
}

const registerDSUFactory = (type, factory) => {
    KeySSIResolver.DSUFactory.registerDSUType(type, factory);
};

const createDSU = (keySSI, options, callback) => {
    if (typeof keySSI === "string") {
        keySSI = keySSISpace.parse(keySSI);
    }
    if (typeof options === "function") {
        callback = options;
        options = undefined;
    }

    const keySSIResolver = initializeResolver(options);
    keySSIResolver.createDSU(keySSI, options, callback);
};

const loadDSU = (keySSI, options, callback) => {
    if (typeof keySSI === "string") {
        keySSI = keySSISpace.parse(keySSI);
    }

    if (typeof options === "function") {
        callback = options;
        options = undefined;
    }

    const keySSIResolver = initializeResolver(options);
    keySSIResolver.loadDSU(keySSI, options, callback);
};

const createWallet = (templateKeySSI, dsuTypeSSI, options, callback) => {
    let keySSI = keySSISpace.parse(templateKeySSI);
    if(typeof options === "function"){
        callback = options;
        options = {};
    }

    options.dsuTypeSSI = dsuTypeSSI;

    const keySSIResolver = initializeResolver(options);
    keySSIResolver.createDSU(keySSI, options, callback);
}

const loadWallet = (secret, options, callback) => {
    let tmpKeySSI = keySSISpace.buildWalletSSI();
    if(typeof options === "function"){
        callback = options;
        options = {};
    }

    tmpKeySSI.getSeedSSI(secret, options, (err, seedSSI)=>{
        if(err){
            return callback(err);
        }

        loadDSU(seedSSI, (err, wallet) =>{
            if(err){
                return callback(err);
            }
            callback(undefined, wallet);
        });
    });
}

const createCustomDSU = () => {

};

const getHandler = () => {

};

module.exports = {
    createDSU,
    loadDSU,
    createWallet,
    loadWallet,
    createCustomDSU,
    getHandler,
    registerDSUFactory
}