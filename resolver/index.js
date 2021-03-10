const KeySSIResolver = require("key-ssi-resolver");
const keySSISpace = require("opendsu").loadApi("keyssi");
const cache = require("../cache");
const sc = require("../sc").createSecurityContext();
let dsuCache = cache.getMemoryCache("DSUs");

const initializeResolver = (options) => {
    options = options || {};
    return KeySSIResolver.initialize(options);
}

const registerDSUFactory = (type, factory) => {
    KeySSIResolver.DSUFactory.prototype.registerDSUType(type, factory);
};

function addDSUInstanceInCache(dsuInstance, callback) {
    dsuInstance.getKeySSIAsString((err, keySSI) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to retrieve keySSI`, err));
        }
        dsuCache.set(keySSI, dsuInstance);
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

        function addInCache(err, result){
            if (err)
            {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create DSU instance`, err));
            }
            addDSUInstanceInCache(dsuInstance, callback);
        }

        dsuInstance.getKeySSIAsObject((err, keySSI) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get SeedSSI`, err));
            }

            sc.registerKeySSI(keySSI);
            dsuInstance.dsuLog("DSU created on " + Date.now(), addInCache);
        });
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
    let fromCache = dsuCache.get(ssiId);
    if (fromCache){
        return callback(undefined, fromCache);
    }
    const keySSIResolver = initializeResolver(options);
    sc.registerKeySSI(keySSI);
    keySSIResolver.loadDSU(keySSI, options, (err, dsuInstance) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to load DSU`, err));
        }
        addDSUInstanceInCache(dsuInstance, callback);
    });
};


const getHandler = (dsuKeySSI, bootEvalScript) => {
    throw Error("Not available yet");
};


const getRemoteHandler = (dsuKeySSI, remoteURL, presentation) => {
    throw Error("Not available yet");
};

function invalidateDSUCache(dsuKeySSI) {
    let  ssiId = dsuKeySSI;
    if(typeof dsuKeySSI != "string"){
        ssiId = dsuKeySSI.getIdentifier();
    }
    delete dsuCache.set(ssiId,undefined);
}

module.exports = {
    createDSU,
    createDSUForExistingSSI,
    loadDSU,
    getHandler,
    registerDSUFactory,
    invalidateDSUCache
}
