const openDSU = require("opendsu");
const bdns = openDSU.loadApi("bdns");
const {fetch, doPut} = openDSU.loadApi("http");
const or = require("overwrite-require");
/**
 * Get brick
 * @param {hashLinkSSI} hashLinkSSI
 * @param {string} authToken
 * @param {function} callback
 * @returns {any}
 */
const getBrick = (hashLinkSSI, authToken, callback) => {
    if (typeof authToken === 'function') {
        callback = authToken;
        authToken = undefined;
    }
    const hashLinkDomain = hashLinkSSI.getDLDomain();
    bdns.getBrickStorages(hashLinkDomain, (err, brickStorageArray) => {
        if (err) {
            return callback(err);
        }

        const brickHash = hashLinkSSI.getHash();

        if (!brickStorageArray.length) {
            return callback('No storage provided');
        }

        const queries = brickStorageArray.map((storage) => fetch(`${storage}/bricks/get-brick/${brickHash}/${hashLinkDomain}`));

        Promise.all(queries).then((responses) => {
            responses[0].arrayBuffer().then((data) => callback(null, data));
        }).catch((err) => callback(err));
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
    const hashLinkDomain = hashLinkSSIList[0].getDLDomain();
    bdns.getBrickStorages(hashLinkDomain, (err, brickStorageArray) => {
        const bricksHashes = hashLinkSSIList.map((hashLinkSSI) => hashLinkSSI.getHash());
        if (!brickStorageArray.length) {
            return callback('No storage provided');
        }

        let index = 0;
        const size = 50;
        const queries = [];

        while (index < bricksHashes.length) {
            const hashQuery = `${bricksHashes.slice(index, size + index).join('&hashes=')}`;
            index += size;
            queries.push(Promise.allSettled(brickStorageArray.map((storage) => {
                return fetch(`${storage}/bricks/downloadMultipleBricks/${hashLinkDomain}/?hashes=${hashQuery}`)
            })));
        }

        Promise.all(queries).then((responses) => {
            Promise.all(responses.reduce((acc, response) => {
                const batch = response.find((item) => item.status === 'fulfilled');

                acc.push(batch.value.arrayBuffer());
                return acc;
            }, [])).
            then(
                (dataArray) => {
                    if ($$.environmentType === or.constants.BROWSER_ENVIRONMENT_TYPE ||
                            $$.environmentType === or.constants.SERVICE_WORKER_ENVIRONMENT_TYPE) {
                        let len = 0;
                        dataArray.forEach(arr => len += arr.byteLength);
                        const newBuffer = new Buffer(len);
                        let currentPos = 0;
                        while (dataArray.length > 0) {
                            const arrBuf = dataArray.shift();
                            const partialDataView = new DataView(arrBuf);
                            for (let i = 0; i < arrBuf.byteLength; i++) {
                                newBuffer.writeUInt8(partialDataView.getUint8(i), currentPos);
                                currentPos += 1;
                            }
                        }
                        return parseResponse(newBuffer, callback);
                    }
                    return parseResponse(Buffer.concat(dataArray), callback)});
        }).catch((err) => {
            callback(err);
        });

        function parseResponse(response, callback) {
            const BRICK_MAX_SIZE_IN_BYTES = 4;

            if (response.length > 0) {
                const brickSizeBuffer = response.slice(0, BRICK_MAX_SIZE_IN_BYTES);

                const brickSize = brickSizeBuffer.readUInt32BE();
                const brickData = response.slice(BRICK_MAX_SIZE_IN_BYTES, brickSize + BRICK_MAX_SIZE_IN_BYTES);

                callback(null, brickData);

                response = response.slice(brickSize + BRICK_MAX_SIZE_IN_BYTES);

                return parseResponse(response, callback);
            }
        }
    });
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
    const hashLinkDomain = keySSI.getDLDomain();
    bdns.getBrickStorages(hashLinkDomain, (err, brickStorageArray) => {
        if (err) {
            return callback(err);
        }

        const queries = brickStorageArray.map((storage) => {
            return new Promise((resolve, reject) => {
                doPut(`${storage}/bricks/put-brick/${hashLinkDomain}`, brick, (err, data) => {
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

            return callback(null, JSON.parse(foundBrick.value).message)
        });
    });
};

module.exports = {getBrick, putBrick, getMultipleBricks};
