const openDSU = require("opendsu");
const bdns = openDSU.loadApi("bdns");
const keyssi = openDSU.loadApi("keyssi");
const {fetch, doPut} = openDSU.loadApi("http");
const config = openDSU.loadApi("config");
const cachedAnchoring = require("./cachedAnchoring");
const constants = require("../moduleConstants");
const cache = require("../cache/cachedStores").getCache(constants.CACHE.ANCHORING_CACHE);
const promiseRunner = require("../utils/promise-runner");

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

    const dlDomain = keySSI.getDLDomain();
    const anchorId = keySSI.getAnchorId();
    if (dlDomain === constants.DOMAINS.VAULT && typeof config.get(constants.CACHE.VAULT_TYPE) !== "undefined") {
        return cachedAnchoring.versions(anchorId, callback);
    }

    bdns.getAnchoringServices(dlDomain, (err, anchoringServicesArray) => {
        if (err) {
            return callback(err);
        }

        if (!anchoringServicesArray.length) {
            return callback('No anchoring service provided');
        }

        //TODO: security issue (which response we trust)
        const fetchAnchor = (service) => {
            return fetch(`${service}/anchor/versions/${keySSI.getAnchorId()}`)
                .then((response) => {
                    return response.json().then((hlStrings) => {
                        const hashLinks = hlStrings.map((hlString) => {
                            return keyssi.parse(hlString);
                        });

                        // cache.put(anchorId, hlStrings);
                        return hashLinks;
                    });
                });
        };

        promiseRunner.runOneSuccessful(anchoringServicesArray, fetchAnchor, callback);
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
    if (typeof lastHashLinkSSI === "function") {
        callback = lastHashLinkSSI;
        lastHashLinkSSI = undefined;
    }

    if (typeof zkpValue === "function") {
        callback = zkpValue;
        zkpValue = undefined;
    }

    const dlDomain = keySSI.getDLDomain();
    const anchorId = keySSI.getAnchorId();
    if (dlDomain === constants.DOMAINS.VAULT && typeof config.get(constants.CACHE.VAULT_TYPE) !== "undefined") {
        return cachedAnchoring.addVersion(anchorId, newHashLinkSSI.getIdentifier(), callback);
    }
    bdns.getAnchoringServices(dlDomain, (err, anchoringServicesArray) => {
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

        const addAnchor = (service) => {
            return new Promise((resolve, reject) => {
                const putResult = doPut(`${service}/anchor/add/${anchorId}`, JSON.stringify(body), (err, data) => {
                    if (err) {
                        return reject({
                            statusCode: err.statusCode,
                            message: err.statusCode === 428 ? 'Unable to add alias: versions out of sync' : err.message || 'Error'
                        });
                    }

                    return resolve(data);
                });
                if(putResult) {
                    putResult.then(resolve).catch(reject);
                }
            })
        };

        promiseRunner.runOneSuccessful(anchoringServicesArray, addAnchor, callback);
    });

};

const getObservable = (keySSI, fromVersion, authToken, timeout) => {
    // TODO: to be implemented
}

module.exports = {
    addVersion,
    versions
}