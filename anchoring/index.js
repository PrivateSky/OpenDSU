const bdns = require("../bdns");
const keyssi = require("../keyssi");
const crypto = require("../crypto");
const {fetch, doPut} = require("../http");
const constants = require("../moduleConstants");
const promiseRunner = require("../utils/promise-runner");
const cachedAnchoring = require("./cachedAnchoring");
const config = require("../config");
const {validateHashLinks} = require("./anchoring-utils");

const NO_VERSIONS_ERROR = "NO_VERSIONS_ERROR";

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
            return fetch(`${service}/anchor/${dlDomain}/get-all-versions/${anchorId}`)
                .then((response) => {
                    return response.json().then(async(hlStrings) => {
                        if(!hlStrings) {
                            throw new Error(NO_VERSIONS_ERROR);
                        }
                        const hashLinks = hlStrings.map((hlString) => {
                            return keyssi.parse(hlString);
                        });

                        const validatedHashLinks = await $$.promisify(validateHashLinks)(keySSI, hashLinks);

                        // cache.put(anchorId, hlStrings);
                        return validatedHashLinks;
                    });
                });
        };

        const runnerCallback = (error, result) => {
            if(error && error.message === NO_VERSIONS_ERROR) {
                // the requested anchor doesn't exist on any of the queried anchoring services,
                // so return an empty versions list in order to now break the existing code in this situation
               return callback(null, []);
            }
            
            callback(error, result);
        }

        promiseRunner.runOneSuccessful(anchoringServicesArray, fetchAnchor, runnerCallback, new Error("get Anchoring Service"));
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
    if (typeof newSSI === "function") {
        callback = newSSI;
        newSSI = undefined;
        lastSSI = undefined;
        zkpValue = '';
    }

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
        return cachedAnchoring.addVersion(anchorId, newSSI ? newSSI.getIdentifier() : undefined, callback);
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
            new: newSSI ? newSSI.getIdentifier(): null
        };

        createDigitalProof(SSICapableOfSigning, hashLinkIds.new, hashLinkIds.last, zkpValue, (err, digitalProof) => {
            const body = {
                hashLinkIds,
                digitalProof,
                zkp: zkpValue
            };

            const addAnchor = (service) => {
                return new Promise((resolve, reject) => {
                    const anchorAction = newSSI ? "append-to-anchor" : "create-anchor";
                    const putResult = doPut(`${service}/anchor/${dlDomain}/${anchorAction}/${anchorId}`, JSON.stringify(body), (err, data) => {
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

function createDigitalProof(SSICapableOfSigning, newSSIIdentifier, lastSSIIdentifier, zkp, callback) {
     // when the anchor is first created, no version is created yet
    if(!newSSIIdentifier) {
        newSSIIdentifier = "";
    }

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


const callContractMethod = (domain, method, ...args) => {
    const callback = args.pop();
    const contracts = require("opendsu").loadApi("contracts");
    contracts.callContractMethod(domain, "anchoring", method, args, callback);
}

const createAnchor = (dsuKeySSI, callback) => {
    addVersion(dsuKeySSI, callback)
}

const createNFT = (nftKeySSI, callback) => {
    addVersion(nftKeySSI, callback)
}

const appendToAnchor = (dsuKeySSI, newShlSSI, previousShlSSI, zkpValue, callback) => {
    addVersion(dsuKeySSI, newShlSSI, previousShlSSI, zkpValue, callback)
}

const transferTokenOwnership = (nftKeySSI, ownershipSSI, callback) => {
    // TODO: to be implemented
    callContractMethod(domain, "transferTokenOwnership", ...args);
}

const getAllVersions = (keySSI, authToken, callback) => {
    versions(keySSI, authToken, callback);
}

const getLatestVersion = (domain, ...args) => {
    // TODO: to be implemented
    callContractMethod(domain, "getLatestVersion", ...args);
}

module.exports = {
    createAnchor,
    createNFT,
    appendToAnchor,
    transferTokenOwnership,
    getAllVersions,
    getLatestVersion
}
