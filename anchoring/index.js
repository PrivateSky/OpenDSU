const bdns = require("../bdns");
const keyssi = require("../keyssi");
const crypto = require("../crypto");
const sc = require("../sc");
const {fetch, doPut} = require("../http");
const constants = require("../moduleConstants");
const promiseRunner = require("../utils/promise-runner");
const cachedAnchoring = require("./cachedAnchoring");
const config = require("../config");

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

                        // cache.put(anchorId, hlStrings);
                        return hashLinks;
                    });
                });
        };

        promiseRunner.runOneSuccessful(anchoringServicesArray, fetchAnchor, callback, new Error("get Anchoring Service"));
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
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get anchoring services from bdns`, err));
        }

        if (!anchoringServicesArray.length) {
            return callback('No anchoring service provided');
        }

        const hashLinkIds = {
            last: lastHashLinkSSI ? lastHashLinkSSI.getIdentifier() : null,
            new: newHashLinkSSI.getIdentifier()
        };
        createDigitalProof(powerfulKeySSI, hashLinkIds.new, hashLinkIds.last, zkpValue, (err, digitalProof) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create digital proof`, err));
            }
            const body = {
                hashLinkIds,
                digitalProof,
                zkp: zkpValue,
                keySSIType: powerfulKeySSI.getTypeName ? powerfulKeySSI.getTypeName() : undefined
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

            promiseRunner.runOneSuccessful(anchoringServicesArray, addAnchor, callback, new Error("Storing a brick"));
        });
    });
};

function createDigitalProof(powerfulKeySSI, newHashLinkIdentifier, lastHashLinkIdentifier, zkp, callback) {
    let anchorId = powerfulKeySSI.getAnchorId();
    let dataToSign = anchorId + newHashLinkIdentifier + zkp;
    if (lastHashLinkIdentifier) {
        dataToSign += lastHashLinkIdentifier;
    }

    let ssiType = powerfulKeySSI.getTypeName();

    getKeySSITypeDigitalProofConfig(ssiType, (err, res) => {
        if (res.dsa === true) {
            let cryptoLib = crypto;
            let keySSI = powerfulKeySSI;
            if (res.crypto === 'securityContext') {
                cryptoLib = sc.createSecurityContext();
                keySSI = cryptoLib.getKeySSI(powerfulKeySSI);
            }
            crypto.sign(powerfulKeySSI, dataToSign, (err, signature) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to sign data`, err));
                }
                const digitalProof = {
                    signature: res.encoding === 'base58' ?  crypto.encodeBase58(signature) : signature,
                    publicKey: res.encoding === 'base58' ? crypto.encodeBase58(keySSI.getPublicKey("raw")) : keySSI.getPublicKey() // non raw
                };
                return callback(undefined, digitalProof);
            });
        }

        return callback(undefined, {signature:"",publicKey:""})

    })
}

const getKeySSITypeDigitalProofConfig = (ssiType, callback) => {
    const output = {
        dsa: false,
        crypto: 'default',
        encoding: 'base58'
    }
    switch(ssiType) {
        case constants.KEY_SSIS.SEED_SSI:
            output.dsa = true
            return callback(undefined, output);
            break;
        case constants.KEY_SSIS.CONST_SSI:
        case constants.KEY_SSIS.ARRAY_SSI:
        case constants.KEY_SSIS.WALLET_SSI:
            return callback(undefined, null)
        default:
            output.dsa = true
            output.crypto = 'securityContext'
            output.encoding = null
            return callback(undefined, output);
    }
}


const getObservable = (keySSI, fromVersion, authToken, timeout) => {
    // TODO: to be implemented
}

module.exports = {
    addVersion,
    versions,
    getKeySSITypeDigitalProofConfig
}
