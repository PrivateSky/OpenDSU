const openDSU = require("opendsu");
const {fetch, doPut} = openDSU.loadApi("http");
const constants = require("../moduleConstants");
const cache = require("../cache/").getCacheForVault(constants.CACHE.ENCRYPTED_BRICKS_CACHE);
const cachedBricking = require("./cachedBricking");
const promiseRunner = require("../utils/promise-runner");
const config = require("../config");

const isValidVaultCache = () => {
    return typeof config.get(constants.CACHE.VAULT_TYPE) !== "undefined" && config.get(constants.CACHE.VAULT_TYPE) !== constants.CACHE.NO_CACHE;
}

const isValidBrickHash = (hashLinkSSI, brickData) => {
    const ensureIsBuffer = require("swarmutils").ensureIsBuffer;
    const crypto = openDSU.loadAPI("crypto");
    const hashFn = crypto.getCryptoFunctionForKeySSI(hashLinkSSI, "hash");
    const actualHash = hashFn(ensureIsBuffer(brickData));
    const expectedHash = hashLinkSSI.getHash();
    return actualHash === expectedHash;
}

/**
 * Get brick
 * @param {hashLinkSSI} hashLinkSSI
 * @param {string} authToken
 * @param {function} callback
 * @returns {any}
 */
const getBrick = (hashLinkSSI, authToken, callback) => {
    const dlDomain = hashLinkSSI.getDLDomain();
    const brickHash = hashLinkSSI.getHash();
    if (typeof authToken === 'function') {
        callback = authToken;
        authToken = undefined;
    }

    if (typeof cache === "undefined") {
        __getBrickFromEndpoint();
    } else {
        cache.get(brickHash, (err, brick) => {
            if (err || typeof brick === "undefined") {
                __getBrickFromEndpoint();
            } else {
                callback(undefined, brick);
            }
        });
    }

    function __getBrickFromEndpoint() {
        const bdns = openDSU.loadApi("bdns");
        bdns.getBrickStorages(dlDomain, (err, brickStorageArray) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get brick storage services from bdns`, err));
            }

            if (!brickStorageArray.length) {
                return callback('No storage provided');
            }

            const fetchBrick = (storage) => {
                return fetch(`${storage}/bricking/${dlDomain}/get-brick/${brickHash}`)
                    .then(async (response) => {
                        const brickData = await response.arrayBuffer();
                        if (isValidBrickHash(hashLinkSSI, brickData)) {
                            if (typeof cache !== "undefined") {
                                cache.put(brickHash, brickData);
                            }
                            return brickData;
                        }
                        throw Error(`Failed to validate brick <${brickHash}>`);
                    });
            };

            const runnerCallback = (error, result) => {
                if(error) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get brick <${brickHash}> from brick storage`, error));
                }
                
                callback(null, result);
            }

            promiseRunner.runOneSuccessful(brickStorageArray, fetchBrick, runnerCallback, "get brick");
        });
    }

};

/**
 * Get multiple bricks
 * @param {hashLinkSSIList} hashLinkSSIList
 * @param {string} authToken
 * @param {function} callback
 */

const getMultipleBricks = (hashLinkSSIList, authToken, callback) => {
    if (typeof authToken === 'function') {
        callback = authToken;
        authToken = undefined;
    }

    const dlDomain = hashLinkSSIList[0].getDLDomain();
    const bricksHashes = hashLinkSSIList.map((hashLinkSSI) => hashLinkSSI.getHash());

    function executeGetBricks(hashLinkSSIList){
        // The bricks need to be returned in the same order they were requested
        let brickPromise = Promise.resolve();
        for (const hl of hashLinkSSIList) {
            // TODO: FIX ME
            // This is a HACK. It should cover 99% of the cases
            // but it might still fail if the brick data transfer
            // is delayed due to network issues and the next iteration
            // resolves faster. The correct solution involves changing
            // multiple layers
            brickPromise = brickPromise.then(() => {
                return new Promise((resolve) => {
                    getBrick(hl, authToken, (err, brick) => {
                        callback(err, brick);
                        resolve();
                    });
                })
            })
        }
    }

    if (dlDomain === constants.DOMAINS.VAULT && isValidVaultCache()) {
        return cachedBricking.getMultipleBricks(bricksHashes, (err, brickData)=>{
            let newTarget = [hashLinkSSIList.shift()];
            if(err || !brickData){
                executeGetBricks(newTarget);
                return;
            }
            callback(err, brickData);
        });
    }

    executeGetBricks(hashLinkSSIList);
};


/**
 * Put brick
 * @param {keySSI} keySSI
 * @param {ReadableStream} brick
 * @param {string} authToken
 * @param {function} callback
 * @returns {string} brickhash
 */
const putBrick = (domain, brick, authToken, callback) => {
    if (typeof authToken === 'function') {
        callback = authToken;
        authToken = undefined;
    }


    if (domain === constants.DOMAINS.VAULT && isValidVaultCache()) {
        return cachedBricking.putBrick(brick, callback);
    }

    const bdns = openDSU.loadApi("bdns");
    bdns.getBrickStorages(domain, (err, brickStorageArray) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get brick storage services from bdns`, err));
        }
        const setBrickInStorage = (storage) => {
            return new Promise((resolve, reject) => {
                const putResult = doPut(`${storage}/bricking/${domain}/put-brick`, brick, (err, data) => {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(data);
                });
                if (putResult) {
                    putResult.then(resolve).catch(reject);
                }
            })
        };

        promiseRunner.runEnoughForMajority(brickStorageArray, setBrickInStorage, null, null, (err, results) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to create bricks",err));
            }

            const foundBrick = results[0];
            const brickHash = JSON.parse(foundBrick).message;
            if (typeof cache === "undefined") {
                return callback(undefined, brickHash)
            }

            cache.put(brickHash, brick, (err) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to put brick <${brickHash}> in cache`, err));
                    }
                    callback(undefined, brickHash);
                })

        }, "Storing a brick");
    });
};

const constructBricksFromData = (keySSI, data, options, callback) => {
    const MAX_BRICK_SIZE = 1024 * 1024; // 1MB
    const defaultOpts = { encrypt: true, maxBrickSize: MAX_BRICK_SIZE };

    if(typeof options === "function") {
        callback = options;
        options = {
            maxBrickSize: MAX_BRICK_SIZE
        };
    }

    options = Object.assign({}, defaultOpts, options);

    const bar = require("bar");
    const archiveConfigurator = bar.createArchiveConfigurator();
    archiveConfigurator.setBufferSize(options.maxBrickSize);
    archiveConfigurator.setKeySSI(keySSI);
    
    const envTypes = require("overwrite-require").constants;
    if($$.environmentType !== envTypes.BROWSER_ENVIRONMENT_TYPE &&
        $$.environmentType !== envTypes.SERVICE_WORKER_ENVIRONMENT_TYPE &&
        $$.environmentType !== envTypes.WEB_WORKER_ENVIRONMENT_TYPE){
            const fsAdapter = require('bar-fs-adapter');
            const ArchiveConfigurator = require("bar").ArchiveConfigurator;
            ArchiveConfigurator.prototype.registerFsAdapter("FsAdapter", fsAdapter.createFsAdapter);
            archiveConfigurator.setFsAdapter("FsAdapter");
    }

    const brickStorageService = bar.createBrickStorageService(archiveConfigurator, keySSI);

    brickStorageService.ingestData(data, options, (err, result) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to ingest data into brick storage service", err));
        }

        callback(undefined, result);
    });
}

module.exports = {getBrick, putBrick, getMultipleBricks, constructBricksFromData};
