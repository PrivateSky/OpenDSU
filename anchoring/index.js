const bdns = require("../bdns");
const keyssi = require("../keyssi");
const crypto = require("../crypto");
const {fetch, doPut} = require("../http");
const config = require("../config");
const cachedAnchoring = require("./cachedAnchoring");
const constants = require("../moduleConstants");
const promiseRunner = require("../utils/promise-runner");

const isValidVaultCache = () => {
  return typeof config.get(constants.CACHE.VAULT_TYPE) !== "undefined" && config.get(constants.CACHE.VAULT_TYPE) !== constants.CACHE.NO_CACHE;
}

/**
 * Get versions
 * @param {keySSI} powerfulKeySSI
 * @param {string} authToken
 * @param {function} callback
 */
const versions = (powerfulKeySSI, authToken, callback) => {
    if (typeof authToken === 'function') {
        callback = authToken;
        authToken = undefined;
    }

    const dlDomain = powerfulKeySSI.getDLDomain();
    const anchorId = powerfulKeySSI.getAnchorId();
    if (dlDomain === constants.DOMAINS.VAULT && isValidVaultCache()) {
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
            return fetch(`${service}/anchor/versions/${powerfulKeySSI.getAnchorId()}`)
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
 * @param {keySSI} powerfulKeySSI
 * @param {hashLinkSSI} newHashLinkSSI
 * @param {hashLinkSSI} lastHashLinkSSI
 * @param {string} zkpValue
 * @param {string} digitalProof
 * @param {function} callback
 */
const addVersion = (powerfulKeySSI, newHashLinkSSI, lastHashLinkSSI, callback) => {
    if (typeof lastHashLinkSSI === "function") {
        callback = lastHashLinkSSI;
        lastHashLinkSSI = undefined;
    }

    const dlDomain = powerfulKeySSI.getDLDomain();
    const anchorId = powerfulKeySSI.getAnchorId();
    if (dlDomain === constants.DOMAINS.VAULT && isValidVaultCache()) {
        return cachedAnchoring.addVersion(anchorId, newHashLinkSSI.getIdentifier(), callback);
    }
    bdns.getAnchoringServices(dlDomain, (err, anchoringServicesArray) => {
        if (err) {
            return callback(err);
        }

        if (!anchoringServicesArray.length) {
            return callback('No anchoring service provided');
        }

        const hash = {
            last: lastHashLinkSSI ? lastHashLinkSSI.getIdentifier() : null,
            new: newHashLinkSSI.getIdentifier()
        };

        crypto.sign(powerfulKeySSI, hash.new, (err, signature) => {
            const digitalProof = {
                signature: crypto.encodeBase58(signature),
                publicKey: crypto.encodeBase58(powerfulKeySSI.getPublicKey("raw"))
            }

            const body = {
                hash,
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

                        require("opendsu").loadApi("resolver").invalidateDSUCache(powerfulKeySSI);
                        return resolve(data);
                    });
                    if(putResult) {
                        putResult.then(resolve).catch(reject);
                    }
                })
            };

            promiseRunner.runOneSuccessful(anchoringServicesArray, addAnchor, callback);
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