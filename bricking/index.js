

const bdns = require('./../index').loadApi('bdns');
const { fetch } = require('../http');

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

    const queries = brickStorageArray.map((storage) => fetch(`${brickStorageArray[0]}/get-brick/${brickHash}`, { method: 'GET' }));

    Promise.any(queries).then((response) => {
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

    const options = {
        method: 'PUT',
        body: brick
    };
    const queries = brickStorageArray.map((storage) => fetch(`${brickStorageArray[0]}/put-brick/${brickHash}`, options));

    Promise.allSettled(queries).then((rawResponses) => {
        Promise.all(rawResponses.find((rawResponse) => rawResponse.status === 201).json()).then((response) => {
            return callback(null, response)
        });
    });
};

module.exports = { getBrick, putBrick };
