const KeySSIResolver = require("key-ssi-resolver");
const keySSISpace = require("opendsu").loadApi("keyssi");
const cache = require("../cache");
const sc = require("../sc").getSecurityContext();
let dsuCache = cache.getMemoryCache("DSUs");
let { ENVIRONMENT_TYPES } = require("../moduleConstants.js");
const { getWebWorkerBootScript, getNodeWorkerBootScript } = require("./resolver-utils");

const initializeResolver = (options) => {
    options = options || {};
    return KeySSIResolver.initialize(options);
};

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

        function addInCache(err, result) {
            if (err) {
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
    if (typeof options === "function") {
        callback = options;
        options = {};
    }
    if (!options) {
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
    if (fromCache) {
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

/*
    boot the DSU in a thread
 */
const getDSUHandler = (dsuKeySSI) => {
    if (typeof dsuKeySSI === "string") {
        // validate the dsuKeySSI to ensure it's valid
        try {
            keySSISpace.parse(dsuKeySSI);
        } catch (error) {
            const errorMessage = `Cannot parse keySSI ${dsuKeySSI}`;
            console.error(errorMessage, error);
            throw new Error(errorMessage);
        }
    }

    const syndicate = require("syndicate");

    function DSUHandler() {
        switch ($$.environmentType) {
            case ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
                throw new Error(`service-worker environment is not supported!`);
            case ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
                if (!window.Worker) {
                    throw new Error("Current environment does not support Web Workers!");
                }

                console.log("[Handler] starting web worker...");

                let blobURL = getWebWorkerBootScript(dsuKeySSI);
                workerPool = syndicate.createWorkerPool({
                    bootScript: blobURL,
                    maximumNumberOfWorkers: 1,
                    workerStrategy: syndicate.WorkerStrategies.WEB_WORKERS,
                });

                setTimeout(() => {
                    // after usage, the blob must be removed in order to avoit memory leaks
                    // it requires a timeout in order for syndicate to be able to get the blob script before it's removed
                    URL.revokeObjectURL(blobURL);
                });

                break;
            case ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE: {
                console.log("[Handler] starting node worker...");

                const script = getNodeWorkerBootScript(dsuKeySSI);
                workerPool = syndicate.createWorkerPool({
                    bootScript: script,
                    maximumNumberOfWorkers: 1,
                    workerOptions: {
                        eval: true,
                    },
                });

                break;
            }
            default:
                throw new Error(`Unknown environment ${$$.environmentType}!`);
        }

        const sendTaskToWorker = (task, callback) => {
            workerPool.addTask(task, (err, message) => {
                if (err) {
                    return callback(err);
                }

                let { error, result } =
                    typeof Event !== "undefined" && message instanceof Event ? message.data : message;

                if (error) {
                    return callback(error);
                }

                if (result) {
                    if (result instanceof Uint8Array) {
                        // the buffers sent from the worker will be converted to Uint8Array when sending to parent
                        result = Buffer.from(result);
                    } else {
                        try {
                            result = JSON.parse(result);
                        } catch (error) {
                            // if parsing fails then the string must be an ordinary one so we leave it as it is
                        }
                    }
                }

                callback(error, result);
            });
        };

        this.callDSUAPI = function (fn, ...args) {
            const fnArgs = [...args];
            const callback = fnArgs.pop();

            const parseResult = (error, result) => {
                if (error) {
                    return callback(error);
                }

                // try to recreate keyssi
                try {
                    result = keySSISpace.parse(result);
                } catch (error) {
                    // if it fails, then the result is not a valid KeySSI
                }
                callback(undefined, result);
            };

            sendTaskToWorker({ fn, args: fnArgs }, parseResult);
        };

        this.callApi = function (fn, ...args) {
            const apiArgs = [...args];
            const callback = apiArgs.pop();
            sendTaskToWorker({ api: fn, args: apiArgs }, callback);
        };
    }

    let res = new DSUHandler();
    let availableFunctions = [
        "addFile",
        "addFiles",
        "addFolder",
        "appendToFile",
        "createFolder",
        "delete",
        //"extractFile",
        //"extractFolder",
        "listFiles",
        "listFolders",
        "mount",
        "readDir",
        "readFile",
        "rename",
        "unmount",
        "writeFile",
        "listMountedDSUs",
        "beginBatch",
        "commitBatch",
        "cancelBatch",
    ];

    function getWrapper(functionName) {
        return function (...args) {
            res.callDSUAPI(functionName, ...args);
        }.bind(res);
    }

    for (let f of availableFunctions) {
        res[f] = getWrapper(f);
    }

    return res;
};

const getRemoteHandler = (dsuKeySSI, remoteURL, presentation) => {
    throw Error("Not available yet");
};

function invalidateDSUCache(dsuKeySSI) {
    let ssiId = dsuKeySSI;
    if (typeof dsuKeySSI != "string") {
        ssiId = dsuKeySSI.getIdentifier();
    }
    delete dsuCache.set(ssiId, undefined);
}

module.exports = {
    createDSU,
    createDSUForExistingSSI,
    loadDSU,
    getDSUHandler,
    registerDSUFactory,
    invalidateDSUCache,
};
