const bdns = require("../bdns");
const keyssi = require("../keyssi");
const {fetch, doPut} = require("../http");
const constants = require("../moduleConstants");
const promiseRunner = require("../utils/promise-runner");
const cachedAnchoring = require("./cachedAnchoring");
const config = require("../config");
const {validateHashLinks, verifySignature} = require("./anchoring-utils");

const isValidVaultCache = () => {
    return typeof config.get(constants.CACHE.VAULT_TYPE) !== "undefined" && config.get(constants.CACHE.VAULT_TYPE) !== constants.CACHE.NO_CACHE;
}

const buildGetVersionFunction = function(processingFunction){
    return function (keySSI, authToken, callback) {
        if (typeof authToken === 'function') {
            callback = authToken;
            authToken = undefined;
        }

        const dlDomain = keySSI.getDLDomain();
        const anchorId = keySSI.getAnchorId();

        if (dlDomain === constants.DOMAINS.VAULT && isValidVaultCache()) {
            return cachedAnchoring.versions(anchorId, callback);
        }

        bdns.getAnchoringServices(dlDomain, function (err, anchoringServicesArray) {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get anchoring services from bdns`, err));
            }

            if (!anchoringServicesArray.length) {
                return callback('No anchoring service provided');
            }

            //TODO: security issue (which response we trust)
            const fetchAnchor = (service) => {
                return fetch(`${service}/anchor/${dlDomain}/get-all-versions/${anchorId}`).then(processingFunction);
            };

            promiseRunner.runOneSuccessful(anchoringServicesArray, fetchAnchor, callback, new Error("get Anchoring Service"));
        });
    }
}

/**
 * Get versions
 * @param {keySSI} keySSI
 * @param {string} authToken
 * @param {function} callback
 */
const getAllVersions = (keySSI, authToken, callback) => {
    const fnc = buildGetVersionFunction((response) => {
        return response.json().then(async (hlStrings) => {
            if (!hlStrings) {
                return [];
            }
            const hashLinks = hlStrings.map((hlString) => {
                return keyssi.parse(hlString);
            });

            const validatedHashLinks = await $$.promisify(validateHashLinks)(keySSI, hashLinks);

            // cache.put(anchorId, hlStrings);
            return validatedHashLinks;
        });
    });
    return fnc(keySSI, authToken, callback);
};

/**
 * Get the latest version only
 * @param {keySSI} keySSI
 * @param {string} authToken
 * @param {function} callback
 */
const getLastVersion = (keySSI, authToken, callback) => {
    const fnc = buildGetVersionFunction((response) => {
        return response.json().then(async (hlStrings) => {
            if (!hlStrings || (Array.isArray(hlStrings) && !hlStrings.length)) {
                //no version found
                return undefined;
            }
            // We need the last two hash links in order to validate the last one
            const hashLinks = hlStrings.slice(-2).map((hlString) => {
                return keyssi.parse(hlString);
            });

            const latestHashLink = hashLinks.pop();
            const prevHashLink = hashLinks.pop();

            const validHL = verifySignature(keySSI, latestHashLink, prevHashLink);

            if (!validHL) {
                throw new Error('Failed to verify signature');
            }

            return latestHashLink;
        });
    });
    return fnc(keySSI, authToken, callback);
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
            new: newSSI ? newSSI.getIdentifier() : null
        };

        createDigitalProof(SSICapableOfSigning, hashLinkIds.new, hashLinkIds.last, zkpValue, (err, digitalProof) => {
            const body = {
                hashLinkIds,
                digitalProof,
                zkp: zkpValue
            };

            const anchorAction = newSSI ? "append-to-anchor" : "create-anchor";

            const addAnchor = (service) => {
                return new Promise((resolve, reject) => {
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

            promiseRunner.runOneSuccessful(anchoringServicesArray, addAnchor, callback, new Error(`Failed during execution of ${anchorAction}`));
        });
    });
};

function createDigitalProof(SSICapableOfSigning, newSSIIdentifier, lastSSIIdentifier, zkp, callback) {
    // when the anchor is first created, no version is created yet
    if (!newSSIIdentifier) {
        newSSIIdentifier = "";
    }

    let anchorId = SSICapableOfSigning.getAnchorId();
    let dataToSign = anchorId + newSSIIdentifier + zkp;
    if (lastSSIIdentifier) {
        dataToSign += lastSSIIdentifier;
    }

    if (SSICapableOfSigning.getTypeName() === constants.KEY_SSIS.CONST_SSI || SSICapableOfSigning.getTypeName() === constants.KEY_SSIS.ARRAY_SSI || SSICapableOfSigning.getTypeName() === constants.KEY_SSIS.WALLET_SSI) {
        return callback(undefined, {signature: "", publicKey: ""});
    }

    return SSICapableOfSigning.sign(dataToSign, callback);
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
    getLastVersion,
    getLatestVersion
}
