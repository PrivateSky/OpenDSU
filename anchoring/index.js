const bdns = require("../index").loadApi("bdns");
const { fetch, doPut } = require('../http');

/**
 * Get versions
 * @param {keySSI} keySSI 
 * @param {string} authToken 
 * @param {function} callback 
 */
const versions = (keySSI, authToken, callback) => {
    if (typeof authToken === 'function') {
        callback = authToken;
        authToken = undefined;
    }

    bdns.getAnchoringServices(keySSI, (err, anchoringServicesArray) => {
        if (err) {
            return callback(err);
        }

        if (!anchoringServicesArray.length) {
            return callback('No anchoring service provided');
        }

        const queries = anchoringServicesArray.map((service) => fetch(`${service}/anchor/versions/${keySSI.getAnchorAlias()}`));

        Promise.allSettled(queries).then((responses) => {
            const response = responses.find((response) => response.status === 'fulfilled');

            response.value.json().then((data) => callback(null, data))
        }).catch((err) => callback(err));
    });
};

/**
 * Add new version
 * @param {keySSI} keySSI 
 * @param {hashLinkSSI} hashLinkSSI 
 * @param {string} authToken 
 * @param {function} callback 
 */
const addVersion = (keySSI, hashLinkSSI, authToken, callback) => {
    if (typeof authToken === 'function') {
        callback = authToken;
        authToken = undefined;
    }

    bdns.getAnchoringServices(keySSI, (err, anchoringServicesArray) => {
        if (err) {
            return callback(err);
        }

        if (!anchoringServicesArray.length) {
            return callback('No anchoring service provided');
        }

        const queries = anchoringServicesArray.map((service) => {
            return new Promise((resolve, reject) => {
                doPut(`${service}/anchor/add/${keySSI.getAnchorAlias()}/${hashLinkSSI.getHash()}`, hashLinkSSI.getHash(), (err, data) => {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(data);
                });
            })
        });

        Promise.allSettled(queries).then((responses) => {
            const response = responses.find((response) => response.status === 'fulfilled');
            if (!response) {
                return callback('error')
            }

            callback(null, response.value);
        });
    });

};

const getObservable = (keySSI, fromVersion, authToken, timeout) => {
    // TODO: to be implemented
}

module.exports = {
    addVersion,
    versions
}