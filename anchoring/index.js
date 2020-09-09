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

        const queries = anchoringServicesArray.map((service) => fetch(`${service}/anchor/versions/${keySSI.getAnchorId()}`));

        Promise.allSettled(queries).then((responses) => {
            const response = responses.find((response) => response.status === 'fulfilled');

            response.value.json().then((data) => callback(null, data))
        }).catch((err) => callback(err));
    });
};

/**
 * Add new version
 * @param {keySSI} keySSI 
 * @param {hashLinkSSI} newHashLinkSSI 
 * @param {hashLinkSSI} lastHashLinkSSI 
 * @param {string} zkpValue 
 * @param {string} digitalProof 
 * @param {function} callback 
 */
const addVersion = (keySSI, newHashLinkSSI, lastHashLinkSSI, zkpValue, digitalProof, callback) => {
    bdns.getAnchoringServices(keySSI, (err, anchoringServicesArray) => {
        if (err) {
            return callback(err);
        }

        if (!anchoringServicesArray.length) {
            return callback('No anchoring service provided');
        }

        const body = {
            hash: {
                last: lastHashLinkSSI ? lastHashLinkSSI.getIdentifier() : null,
                new: newHashLinkSSI.getIdentifier()
            },
            zkpValue,
            digitalProof
        };

        const queries = anchoringServicesArray.map((service) => {
            return new Promise((resolve, reject) => {
                doPut(`${service}/anchor/add/${keySSI.getAnchorId()}`, body, (err, data) => {
                    if (err) {
                        return reject({
                            statusCode: err.statusCode,
                            message: err.statusCode === 428 ? 'Unable to add alias: versions out of sync' : err.message || 'Error'
                        });
                    }

                    return resolve(data);
                });
            })
        });

        Promise.allSettled(queries).then((responses) => {
            const response = responses.find((response) => response.status === 'fulfilled');

            if (!response) {
                const rejected = responses.find((response) => response.status === 'rejected');
                return callback(rejected.reason)
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