function getWebWorkerBootScript() {
    const scriptLocation = document.currentScript
        ? document.currentScript
        : new Error().stack.match(/([^ ^(\n])*([a-z]*:\/\/\/?)*?[a-z0-9\/\\]*\.js/gi)[0];
    return URL.createObjectURL(
        new Blob(
            [
                `
                (function () {
                    importScripts("${scriptLocation}");
                    (${require("./bootScript/web").toString()})();     
                })()
                `
            ],
            { type: "application/javascript" }
        )
    );
}

function getNodeWorkerBootScript() {
    const openDSUScriptPath = global.bundlePaths.openDSU.replace(/\\/g, "\\\\").replace(".js", "");
    return `
        require("${openDSUScriptPath}");
        (${require("./bootScript/node").toString()})();
    `;
}

function createPoolOfWebWorkers(options = {}) {
    if (!window.Worker) {
        return;
    }

    console.log("[workers] starting web worker...");

    const syndicate = require("syndicate");
    const blobURL = getWebWorkerBootScript();
    const workerPool = syndicate.createWorkerPool({
        bootScript: blobURL,
        workerStrategy: syndicate.WorkerStrategies.WEB_WORKERS,
        ...options
    });

    setTimeout(() => {
        // after usage, the blob must be removed in order to avoid memory leaks
        // it requires a timeout in order for syndicate to be able to get the blob script before it's removed
        URL.revokeObjectURL(blobURL);
    });

    return workerPool;
}

function createPoolOfNodeWorkers(options = {}) {
    const worker_threads = "worker_threads";
    const { isMainThread } = require(worker_threads);

    if (!isMainThread) {
        return;
    }

    console.log("[workers] starting node worker...");

    return require("syndicate").createWorkerPool({
        bootScript: getNodeWorkerBootScript(),
        workerOptions: { eval: true },
        ...options,
    });
}

function run(functionName, payload, callback) {
    if (!this.workerPool) {
        try {
            const result = require("opendsu").loadAPI("workers").getFunctionsRegistry()[functionName](payload);
            return callback(undefined, result);
        } catch (error) {
            return callback(error);
        }
    }

    this.workerPool.addTask({ functionName, payload }, (error, result) => {
        if (error) {
            return callback(error);
        }

        // this is quite a hack or workaround made for portability
        // in WebWorkers messages are transmitted through "Events" (event.data)
        // but in NodeWorkers messages are send as "Objects" (data)
        const {
            error: taskError,
            result: taskResult
        } = typeof Event !== "undefined" && result instanceof Event ? result.data : result;

        if (taskError) {
            return callback(taskError);
        }

        return callback(undefined, taskResult);
    });
}


/**
 * Cross Environment wrapper over syndicate
 */
class CrossEnvironmentWorkerPool {
    constructor(options) {
        const { ENVIRONMENT_TYPES } = require("../moduleConstants.js");
        this.workerPool = undefined;

        switch ($$.environmentType) {
            case ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
                this.workerPool = createPoolOfWebWorkers(options);
                break;
            case ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
                this.workerPool = createPoolOfNodeWorkers(options);
                break;
        }
    }

    runSyncFunction(apiSpaceName, functionName, ...params) {
        const currentFunctionName = "runSyncFunction";
        const callback = params.pop();
        const payload = { apiSpaceName, functionName, params };

        if (typeof callback !== 'function') {
            console.error(`[workers] function ${currentFunctionName} must receive a callback!`);
            return;
        }

        run.call(this, currentFunctionName, payload, callback);
    }
}

function createPool(options) {
    return new CrossEnvironmentWorkerPool(options);
}

function getFunctionsRegistry() {
    return require("./functions");
}

module.exports = {
    createPool,
    getFunctionsRegistry
}