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
            return fetch(`${service}/anchor/${dlDomain}/versions/${powerfulKeySSI.getAnchorId()}`)
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
const addVersion = (powerfulKeySSI, newHashLinkSSI, lastHashLinkSSI, zkpValue, callback) => {
    if (typeof lastHashLinkSSI === "function") {
        callback = lastHashLinkSSI;
        lastHashLinkSSI = undefined;
    }

    if (typeof zkpValue === "function") {
        callback = zkpValue;
        zkpValue = '';
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
        createDigitalProof(powerfulKeySSI, hash.new, hash.last, zkpValue, (err, digitalProof) => {
            if (err) {
                return callback(err);
            }
            const body = {
                hash,
                digitalProof,
                zkp: zkpValue
            };

            const addAnchor = (service) => {
                return new Promise((resolve, reject) => {
                    const putResult = doPut(`${service}/anchor/${dlDomain}/add/${anchorId}`, JSON.stringify(body), (err, data) => {
                        if (err) {
                            return reject({
                                statusCode: err.statusCode,
                                message: err.statusCode === 428 ? 'Unable to add alias: versions out of sync' : err.message || 'Error'
                            });
                        }

                        require("opendsu").loadApi("resolver").invalidateDSUCache(powerfulKeySSI);
                        return resolve(data);
                    });
                    if (putResult) {
                        putResult.then(resolve).catch(reject);
                    }
                })
            };

            promiseRunner.runOneSuccessful(anchoringServicesArray, addAnchor, callback);
        });
    });
};

function createDigitalProof(powerfulKeySSI, newHashLinkIdentifier, lastHashLinkIdentifier, zkp, callback) {
    let anchorId = powerfulKeySSI.getAnchorId();
    let dataToSign = anchorId + newHashLinkIdentifier + zkp;
    if (!lastHashLinkIdentifier) {
        dataToSign += lastHashLinkIdentifier;
    }

    // return callback(undefined, "somesignature");

    crypto.sign(powerfulKeySSI, dataToSign, (err, signature) => {
        if (err) {
            return callback(err);
        }
        const digitalProof = {
            signature: crypto.encodeBase58(signature),
            publicKey: crypto.encodeBase58(powerfulKeySSI.getPublicKey("raw"))
        };

        return callback(undefined, digitalProof);
    });
}

const getObservable = (keySSI, fromVersion, authToken, timeout) => {
    // TODO: to be implemented
}

module.exports = {
    addVersion,
    versions
}