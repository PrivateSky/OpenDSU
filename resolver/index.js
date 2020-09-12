const EDFS = require("edfs");
const BootstrapingService = EDFS.BootstrapingService;
const DSUFactory = EDFS.DSUFactory;
const BrickMapStrategyFactory = require("bar").BrickMapStrategyFactory;
const KeySSIResolver = require("key-ssi-resolver");
const keyssi = require("../index").loadApi("keyssi");

const initializeResolver = (options) => {
    options = options || {};
    options.bootstrapingService = options.bootstrapingService || new BootstrapingService(options);

    options.dsuFactory =  new DSUFactory({
        bootstrapingService: options.bootstrapingService,
        brickMapStrategyFactory: new BrickMapStrategyFactory(),
        keySSIFactory: KeySSIResolver.KeySSIFactory
    })

    return KeySSIResolver.initialize(options);
}

const createDSU = (keySSI, options, callback) => {
    if (typeof keySSI === "string") {
        keySSI = keyssi.parse(keySSI);
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
        keySSI = keyssi.parse(keySSI);
    }

    if (typeof options === "function") {
        callback = options;
        options = undefined;
    }

    const keySSIResolver = initializeResolver(options);
    keySSIResolver.loadDSU(keySSI, options, callback);
};

const createCustomDSU = () => {

};

const getHandler = () => {

};

module.exports = {
    createDSU,
    loadDSU,
    createCustomDSU,
    getHandler
}