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

function addDSUInstanceInCache(dsuInstance, callback) {
    dsuInstance.getKeySSI((err, keySSI) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to retrieve keySSI`, err));
        }

        if(typeof dsuInstances[keySSI] === "undefined"){
            dsuInstances[keySSI] = dsuInstance;
        }

        callback(undefined, dsuInstance);

    });
}

const createDSU = (templateKeySSI, options, callback) => {
    if (typeof templateKeySSI === "string") {
        templateKeySSI = keySSISpace.parse(templateKeySSI);
    }
    if (typeof options === "function") {
        callback = options;
        options = undefined;
    }

    const keySSIResolver = initializeResolver(options);
    keySSIResolver.createDSU(templateKeySSI, options, (err, dsuInstance) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create DSU instance`, err));
        }

        function addInCache(){
            addDSUInstanceInCache(dsuInstance, function(){
            callback(undefined, dsuInstance)
            });
        }
        dsuInstance.dsuLog("DSU created on " + Date.now(), addInCache);
    });
};


const createDSUForExistingSSI = (ssi, options, callback) => {
    if(typeof options === "function"){
        callback = options;
        options = {};
    }
    if(!options){
        options = {};
    }
    options.useSSIAsIdentifier = true;
    createDSU(ssi, options, callback);
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
    keySSIResolver.loadDSU(keySSI, options, (err, dsuInstance) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU`, err));
        }
        addDSUInstanceInCache(dsuInstance, callback);
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
    createDSUForExistingSSI,
    loadDSU,
    getHandler,
    registerDSUFactory,
    invalidateDSUCache
}
