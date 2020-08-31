/*
html API space
*/

const pskCrypto = require('pskcrypto');
const edfsBrickStorage = require('edfs-brick-storage').createBrickStorageService();

const getBrick = (hashLinkSSI, authToken, callback) => {
    const hash = getHash(hashLinkSSI);


    edfsBrickStorage.getBrick(hash, (err, brick) => {
        if (err) {
            return callback(err);
        }

        return callback(null, pskCrypto.privateDencrypt(authToken, brick));
    });
};

const putBrick = (brickStorageSSI, brick, authToken, callback) => {
    const encryptedBrick = pskCrypto.privateEncrypt(authToken, brick);

    return edfsBrickStorage.putBrick(brickStorageSSI, encryptedBrick, callback);
};

const getHash = (hashLinkSSI) => {
    // TO BE implemented
    return hashLinkSSI
}

module.exports = { getBrick, putBrick };