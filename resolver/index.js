const KeySSIResolver = require("key-ssi-resolver");
const keySSISpace = require("opendsu").loadApi("keyssi");
const dsuInstances = {};
const initializeResolver = (options) => {
    options = options || {};
    return KeySSIResolver.initialize(options);
}

const registerDSUFactory = (type, factory) => {
    KeySSIResolver.DSUFactory.prototype.registerDSUType(type, factory);
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

    const ssiId = keySSI.getIdentifier();
    if (dsuInstances[ssiId]) {
        return callback(undefined, dsuInstances[ssiId]);
    }
    const keySSIResolver = initializeResolver(options);
    keySSIResolver.loadDSU(keySSI, options, (err, newDSU) => {
        if (err) {
            return callback(createOpenDSUErrorWrapper(`Failed to load DSU with keySSI <${keySSI.getIdentifier()}>`, err));
        }

        if (typeof dsuInstances[ssiId] === "undefined") {
            dsuInstances[ssiId] = newDSU;
        }

        callback(undefined, newDSU);
    });
};




const getHandler = () => {
    throw Error("Not available yet");
};


function invalidateDSUCache(dsuKeySSI) {
    const ssiId = dsuKeySSI.getIdentifier();
    delete dsuInstances[ssiId]
}

module.exports = {
    createDSU,
    loadDSU,
    getHandler,
    registerDSUFactory,
    invalidateDSUCache
}
