

const bdns = require('./../index').loadApi('bdns');
const { fetch, doPut } = require('../http');

/**
 * Get brick
 * @param {hashLinkSSI} hashLinkSSI 
 * @param {string} authToken 
 * @param {function} callback 
 */
const getBrick = (hashLinkSSI, authToken, callback) => {
    const brickStorageArray = bdns.getBrickStorages(hashLinkSSI);
    const brickHash = hashLinkSSI.getHash();

    if (!brickStorageArray.length) {
        return callback('No storage provided');
    }

    const queries = brickStorageArray.map((storage) => fetch(`${storage}/get-brick/${brickHash}`));

    Promise.any(queries).then((response) => {
        response.json().then((data) => callback(null, data))
    }).catch((err) => callback(err));
};

/**
 * Get multiple bricks
 * @param {hashLinkSSIList} hashLinkSSIList 
 * @param {string} authToken 
 * @param {function} callback 
 */
const getMultipleBricks = (hashLinkSSIList, authToken, callback) => {
    const brickStorageArray = bdns.getBrickStorages(hashLinkSSIList[0]);
    const bricksHashes = hashLinkSSIList.map((hashLinkSSI) => hashLinkSSI.getHash());

    if (!brickStorageArray.length) {
        return callback('No storage provided');
    }

    let index = 0;
    const size = 50;
    const queries = [];

    while (index < bricksHashes.length) {
        const hashQuery = `"${bricksHashes.slice(index, size + index).join('&hashes=')}"`;
        index += size;
        queries.push(Promise.any(brickStorageArray.map((storage) => fetch(`${storage}/downloadMultipleBricks/?hashes=${hashQuery}`))));
    }

    Promise.all(queries).then((response) => {
        response.json().then((data) => callback(null, data))
    }).catch((err) => callback(err));
};

/**
 * Put brick
 * @param {keySSI} keySSI 
 * @param {ReadableStream} brick 
 * @param {string} authToken 
 * @param {function} callback 
 */
const putBrick = (keySSI, brick, authToken, callback) => {
    const brickStorageArray = bdns.getBrickStorages(hashLinkSSI);

    // const options = {
    //     method: 'PUT',
    //     body: brick
    // };
    // const queries = brickStorageArray.map((storage) => fetch(`${brickStorageArray[0]}/put-brick/${brickHash}`, options));

    const queries = brickStorageArray.map((storage) => {
        return new Promise((resolve, reject) => {
            doPut(`${brickStorageArray[0]}/put-brick/${brickHash}`, brick, resolve)
        })
    })
    Promise.allSettled(queries).then((rawResponses) => {
        Promise.all(rawResponses.find((rawResponse) => rawResponse.status === 201).json()).then((response) => {
            return callback(null, response)
        });
    });
};

module.exports = { getBrick, putBrick, getMultipleBricks };
