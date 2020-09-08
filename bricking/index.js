const bdns = require('./../index').loadApi('bdns');
const { fetch, doPut } = require('../index').loadApi("http");

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

    bdns.getBrickStorages(hashLinkSSI, (err, brickStorageArray) => {
        if (err) {
            return callback(err);
        }

        const brickHash = hashLinkSSI.getHash();

        if (!brickStorageArray.length) {
            return callback('No storage provided');
        }

        const queries = brickStorageArray.map((storage) => fetch(`${storage}/bricks/get-brick/${brickHash}`));

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

    bdns.getBrickStorages(hashLinkSSIList[0], (err, brickStorageArray) => {
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
                return fetch(`${storage}/bricks/downloadMultipleBricks/?hashes=${hashQuery}`)
            })));
        }

        Promise.all(queries).then((responses) => {
            Promise.all(responses.reduce((acc, response) => {
                const batch = response.find((item) => item.status === 'fulfilled');

                acc.push(batch.value.arrayBuffer());
                return acc;
            }, [])).then((data) => parseResponse(Buffer.concat(data), callback));
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

                return parseResponse(response);
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

    bdns.getBrickStorages(keySSI, (err, brickStorageArray) => {
        if (err) {
            return callback(err);
        }
        
        const queries = brickStorageArray.map((storage) => {
            return new Promise((resolve, reject) => {
                doPut(`${storage}/bricks/put-brick`, brick, (err, data) => {
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
                return callback({ message: 'Brick not created' });
            }

            return callback(null, JSON.parse(foundBrick.value).message)
        });
    });
};

module.exports = { getBrick, putBrick, getMultipleBricks };
