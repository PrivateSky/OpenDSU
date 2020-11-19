const openDSU = require("opendsu");
const bdns = openDSU.loadApi("bdns");
const {fetch, doPut} = openDSU.loadApi("http");
const config = openDSU.loadApi("config");
const cachedBricking = require("./cachedBricking");
const constants = require("../moduleConstants");
const cache = require("../cache/cachedStores").getCache(constants.CACHE.ENCRYPTED_BRICKS_CACHE);
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

    if (dlDomain === constants.DOMAINS.VAULT && typeof config.get(constants.CACHE.VAULT_TYPE) !== "undefined") {
        return cachedBricking.getBrick(brickHash, callback);
    }

    cache.get(brickHash, (err, brick) => {
        if (err || typeof brick === "undefined") {
            bdns.getBrickStorages(dlDomain, (err, brickStorageArray) => {
                if (err) {
                    return callback(err);
                }

                if (!brickStorageArray.length) {
                    return callback('No storage provided');
                }

                const queries = brickStorageArray.map((storage) => fetch(`${storage}/bricks/get-brick/${brickHash}/${dlDomain}`));

                Promise.all(queries).then((responses) => {
                    responses[0].arrayBuffer().then((data) => {
                        cache.put(brickHash, data);
                        callback(null, data)
                    });
                }).catch((err) => {
                    callback(err);
                });
            });
        } else {
            callback(undefined, brick);
        }
    });
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

    if (dlDomain === constants.DOMAINS.VAULT && typeof config.get(constants.CACHE.VAULT_TYPE) !== "undefined") {
        return cachedBricking.getMultipleBricks(bricksHashes, callback);
    }
    hashLinkSSIList.forEach(hashLinkSSI => getBrick(hashLinkSSI, authToken, callback));
};
// const getMultipleBricks = (hashLinkSSIList, authToken, callback) => {
//     if (typeof authToken === 'function') {
//         callback = authToken;
//         authToken = undefined;
//     }
//     const dlDomain = hashLinkSSIList[0].getDLDomain();
//     const bricksHashes = hashLinkSSIList.map((hashLinkSSI) => hashLinkSSI.getHash());
//     const stringOfHashes = bricksHashes.join("|");
//     if (dlDomain === constants.DOMAINS.VAULT && typeof config.get(constants.CACHE.VAULT_TYPE) !== "undefined") {
//         return cachedBricking.getMultipleBricks(bricksHashes, callback);
//     }
//     if($$.environmentType === constants.ENVIRONMENT.BROWSER_ENVIRONMENT_TYPE ||
//     $$.environmentType === constants.ENVIRONMENT.SERVICE_WORKER_ENVIRONMENT_TYPE){
//         cache.get(stringOfHashes, (err, bricks) => {
//             if (err || typeof bricks === "undefined") {
//                 console.log("Error /////////////////", err);
//                 getBricks();
//             } else {
//                 console.log('Getting file from cache', stringOfHashes);
//                 if (bricksHashes.length === 1) {
//                     console.log("brickHashes.length === 1 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`");
//                     return callback(undefined, bricks)
//                 }
//                 // bricks.forEach(brick => callback(undefined, brick));
//             }
//         });
//     }else{
//         getBricks();
//     }
//     function getBricks(){
//         bdns.getBrickStorages(dlDomain, (err, brickStorageArray) => {
//             if (!brickStorageArray.length) {
//                 return callback('No storage provided');
//             }
//
//             let index = 0;
//             const size = 50;
//             const queries = [];
//
//             while (index < bricksHashes.length) {
//                 const hashQuery = `${bricksHashes.slice(index, size + index).join('&hashes=')}`;
//                 index += size;
//                 queries.push(Promise.allSettled(brickStorageArray.map((storage) => {
//                     return fetch(`${storage}/bricks/downloadMultipleBricks/${dlDomain}/?hashes=${hashQuery}`)
//                 })));
//             }
//
//             Promise.all(queries).then((responses) => {
//                 Promise.all(responses.reduce((acc, response) => {
//                     const batch = response.find((item) => item.status === 'fulfilled');
//
//                     acc.push(batch.value.arrayBuffer());
//                     return acc;
//                 }, [])).then(
//                     (dataArray) => {
//                         if ($$.environmentType === constants.ENVIRONMENT.BROWSER_ENVIRONMENT_TYPE ||
//                             $$.environmentType === constants.ENVIRONMENT.SERVICE_WORKER_ENVIRONMENT_TYPE) {
//                             let len = 0;
//                             dataArray.forEach(arr => len += arr.byteLength);
//                             const newBuffer = new Buffer(len);
//                             let currentPos = 0;
//                             while (dataArray.length > 0) {
//                                 const arrBuf = dataArray.shift();
//                                 const partialDataView = new DataView(arrBuf);
//                                 for (let i = 0; i < arrBuf.byteLength; i++) {
//                                     newBuffer.writeUInt8(partialDataView.getUint8(i), currentPos);
//                                     currentPos += 1;
//                                 }
//                             }
//                             return cache.put(stringOfHashes, newBuffer, err => {
//                                 if (err) {
//                                     console.log("Error at putting ++++++++++++++++++++++++++++++++++", stringOfHashes)
//                                     return callback(err);
//                                 }
//                                 return parseResponse(newBuffer, callback);
//                             });
//                         }
//                         const bricksBuffer = Buffer.concat(dataArray);
//                         return cache.put(stringOfHashes, bricksBuffer, err => {
//                             if (err) {
//                                 console.log("Error at putting ++++++++++++++++++++++++++++++++++", stringOfHashes)
//                                 return callback(err);
//                             }
//                             return parseResponse(bricksBuffer, callback);
//                         });
//                         function parseResponse(response, callback) {
//                             const BRICK_MAX_SIZE_IN_BYTES = 4;
//
//                             if (response.length > 0) {
//                                 const brickSizeBuffer = response.slice(0, BRICK_MAX_SIZE_IN_BYTES);
//
//                                 const brickSize = brickSizeBuffer.readUInt32BE();
//                                 const brickData = response.slice(BRICK_MAX_SIZE_IN_BYTES, brickSize + BRICK_MAX_SIZE_IN_BYTES);
//                                 callback(null, brickData);
//
//                                 response = response.slice(brickSize + BRICK_MAX_SIZE_IN_BYTES);
//
//                                 return parseResponse(response, callback);
//                             }
//                         }
//                     });
//             }).catch((err) => {
//                 callback(err);
//             });
//         })
//     }
//
// };

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

    if (dlDomain === constants.DOMAINS.VAULT && typeof config.get(constants.CACHE.VAULT_TYPE) !== "undefined") {
        return cachedBricking.putBrick(brick, callback);
    }

    bdns.getBrickStorages(dlDomain, (err, brickStorageArray) => {
        if (err) {
            return callback(err);
        }

        const queries = brickStorageArray.map((storage) => {
            return new Promise((resolve, reject) => {
                doPut(`${storage}/bricks/put-brick/${dlDomain}`, brick, (err, data) => {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(data);
                });
            })
        });

        Promise.allSettled(queries).then((responses) => {
            const foundBrick = responses.find((response) => response.status === 'fulfilled');

            if (!foundBrick) {
                return callback({message: 'Brick not created'});
            }

            const brickHash = JSON.parse(foundBrick.value).message;
            return cache.put(brickHash, brick, err => {
                if (err) {
                    return callback(err);
                }
                callback(err, brickHash);
            });
        }).catch(err => {
            return callback(err);
        });
    });
};

module.exports = {getBrick, putBrick, getMultipleBricks};
