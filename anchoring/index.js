const bdns = require("../bdns");
const keyssi = require("../keyssi");
const crypto = require("../crypto");
const {fetch, doPut} = require("../http");
const constants = require("../moduleConstants");
const promiseRunner = require("../utils/promise-runner");
const cachedAnchoring = require("./cachedAnchoring");
const config = require("../config");
const {validateHashLinks} = require("./anchoring-utils");

const isValidVaultCache = () => {
    return typeof config.get(constants.CACHE.VAULT_TYPE) !== "undefined" && config.get(constants.CACHE.VAULT_TYPE) !== constants.CACHE.NO_CACHE;
}
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

    if (dlDomain === constants.DOMAINS.VAULT && isValidVaultCache()) {
        return cachedAnchoring.versions(anchorId, callback);
    }


    bdns.getAnchoringServices(dlDomain, (err, anchoringServicesArray) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get anchoring services from bdns`, err));
        }

        if (!anchoringServicesArray.length) {
            return callback('No anchoring service provided');
        }

        //TODO: security issue (which response we trust)
        const fetchAnchor = (service) => {
            return fetch(`${service}/anchor/${dlDomain}/versions/${anchorId}`)
                .then((response) => {
                    return response.json().then((hlStrings) => {
                        const hashLinks = hlStrings.map((hlString) => {
                            return keyssi.parse(hlString);
                        });

                        const validatedHashLinks = $$.promisify(validateHashLinks)(keySSI, hashLinks);

                        // cache.put(anchorId, hlStrings);
                        return validatedHashLinks;
                    });
                });
        };

        promiseRunner.runOneSuccessful(anchoringServicesArray, fetchAnchor, callback, new Error("get Anchoring Service"));
    });
};

/**
 * Add new version
 * @param {keySSI} SSICapableOfSigning
 * @param {hashLinkSSI} newSSI
 * @param {hashLinkSSI} lastSSI
 * @param {string} zkpValue
 * @param {string} digitalProof
 * @param {function} callback
 */
const addVersion = (SSICapableOfSigning, newSSI, lastSSI, zkpValue, callback) => {
    if (typeof lastSSI === "function") {
        callback = lastSSI;
        lastSSI = undefined;
        zkpValue = '';
    }

    if (typeof zkpValue === "function") {
        callback = zkpValue;
        zkpValue = '';
    }

    const dlDomain = SSICapableOfSigning.getDLDomain();
    const anchorId = SSICapableOfSigning.getAnchorId();

    if (dlDomain === constants.DOMAINS.VAULT && isValidVaultCache()) {
        return cachedAnchoring.addVersion(anchorId, newSSI.getIdentifier(), callback);
    }

    bdns.getAnchoringServices(dlDomain, (err, anchoringServicesArray) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get anchoring services from bdns`, err));
        }

        if (!anchoringServicesArray.length) {
            return callback('No anchoring service provided');
        }

        const hashLinkIds = {
            last: lastSSI ? lastSSI.getIdentifier() : null,
            new: newSSI.getIdentifier()
        };

        createDigitalProof(SSICapableOfSigning, hashLinkIds.new, hashLinkIds.last, zkpValue, (err, digitalProof) => {
            const body = {
                hashLinkIds,
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

                        require("opendsu").loadApi("resolver").invalidateDSUCache(SSICapableOfSigning);
                        return resolve(data);
                    });
                    if (putResult) {
                        putResult.then(resolve).catch(reject);
                    }
                })
            };

            promiseRunner.runOneSuccessful(anchoringServicesArray, addAnchor, callback, new Error("Storing a brick"));
        });
    });
};

function getVersionForOwnershipSSI(ownershipSSI, newSSI, lastSSI, callback) {
    let retSSIIdentifier;
    const timestamp = Date.now();
    let dataToSign;
    if (typeof lastSSI === "undefined") {
        dataToSign = timestamp;
    } else {
        dataToSign = lastSSI.getIdentifier();
    }
    if (newSSI.getTypeName() === constants.KEY_SSIS.TRANSFER_SSI) {
        //sign(lastEntryInAnchor, timestamp, hash New Public Key)
        dataToSign += newSSI.getControlString();
        ownershipSSI.sign(dataToSign, (err, signature) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper("Filed to sign data", err));
            }
            const transferSSI = keyssi.createTransferSSI(newSSI.getDLDomain(), newSSI.getControlString(), timestamp, signature);
            retSSIIdentifier = transferSSI.getIdentifier();
            callback(undefined, retSSIIdentifier);
        });
    } else if (newSSI.getTypeName() === constants.KEY_SSIS.HASH_LINK_SSI) {
        //sign(lastEntryInAnchor, timestamp, hashLink)
        dataToSign += newSSI.getIdentifier();
        ownershipSSI.sign(dataToSign, (err, signature) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper("Filed to sign data", err));
            }
            const signedHashLinkSSI = keyssi.createSignedHashLinkSSI(newSSI.getDLDomain(), newSSI.getIdentifier(), timestamp, signature);
            retSSIIdentifier = signedHashLinkSSI.getIdentifier();
        });
    }

    callback(createOpenDSUErrorWrapper("Invalid ssi type"));
}

function createDigitalProof(SSICapableOfSigning, newSSIIdentifier, lastSSIIdentifier, zkp, callback) {
    let anchorId = SSICapableOfSigning.getAnchorId();
    let dataToSign = anchorId + newSSIIdentifier + zkp;
    if (lastSSIIdentifier) {
        dataToSign += lastSSIIdentifier;
    }

    if (SSICapableOfSigning.canSign() === true) {
        return SSICapableOfSigning.sign(dataToSign, callback);
    }

    callback(undefined, {signature: "", publicKey: ""});
}

const getObservable = (keySSI, fromVersion, authToken, timeout) => {
    // TODO: to be implemented
}

module.exports = {
    addVersion,
    versions
}