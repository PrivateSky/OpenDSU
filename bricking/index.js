const openDSU = require("opendsu");
const bdns = openDSU.loadApi("bdns");
const {fetch, doPut} = openDSU.loadApi("http");
const constants = require("../moduleConstants");
const cache = require("../cache/").getCacheForVault(constants.CACHE.ENCRYPTED_BRICKS_CACHE);
const cachedBricking = require("./cachedBricking");
const promiseRunner = require("../utils/promise-runner");
const config = require("../config");

const isValidVaultCache = () => {
    return typeof config.get(constants.CACHE.VAULT_TYPE) !== "undefined" && config.get(constants.CACHE.VAULT_TYPE) !== constants.CACHE.NO_CACHE;
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

    if (dlDomain === constants.DOMAINS.VAULT && isValidVaultCache()) {
        return cachedBricking.getBrick(brickHash, callback);
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
        bdns.getBrickStorages(dlDomain, (err, brickStorageArray) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get brick storage services from bdns`, err));
            }

            if (!brickStorageArray.length) {
                return callback('No storage provided');
            }

            const queries = brickStorageArray.map((storage) => fetch(`${storage}/bricking/${dlDomain}/get-brick/${brickHash}/${dlDomain}`));

            Promise.all(queries).then((responses) => {
                responses[0].arrayBuffer().then((data) => {
                    if (typeof cache !== "undefined") {
                        cache.put(brickHash, data);
                    }
                    callback(null, data)
                });
            }).catch((err) => {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get brick <${brickHash}> from brick storage`, err));
            });
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

    if (dlDomain === constants.DOMAINS.VAULT && isValidVaultCache()) {
        return cachedBricking.getMultipleBricks(bricksHashes, callback);
    }
    hashLinkSSIList.forEach(hashLinkSSI => getBrick(hashLinkSSI, authToken, callback));
};


/**
 * Put brick
 * @param {keySSI} keySSI
 * @param {ReadableStream} brick
 * @param {string} authToken
 * @param {function} callback
 * @returns {string} brickhash
 */
const putBrick = (keySSI, brick, authToken, callback) => {
    if (typeof authToken === 'function') {
        callback = authToken;
        authToken = undefined;
    }
    const dlDomain = keySSI.getDLDomain();

    if (dlDomain === constants.DOMAINS.VAULT && isValidVaultCache()) {
        return cachedBricking.putBrick(brick, callback);
    }

    bdns.getBrickStorages(dlDomain, (err, brickStorageArray) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get brick storage services from bdns`, err));
        }
        const setBrick = (storage) => {
            return new Promise((resolve, reject) => {
                const putResult = doPut(`${storage}/bricking/${dlDomain}/put-brick/${dlDomain}`, brick, (err, data) => {
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

        promiseRunner.runAll(brickStorageArray, setBrick, null, (err, results) => {
            if (err || !results.length) {
                if (!err) {
                    err = new Error('Failed to create bricks in:' + brickStorageArray);
                }
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

        }, new Error("Storing a brick"));
    });
};

module.exports = {getBrick, putBrick, getMultipleBricks};
