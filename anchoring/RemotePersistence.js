function RemotePersistence() {
    const openDSU = require("opendsu");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const resolver = openDSU.loadAPI("resolver");
    const http = openDSU.loadAPI("http");
    const promiseRunner = require("../utils/promise-runner");

    const getAnchoringServices = (dlDomain, callback) => {
        const bdns = openDSU.loadAPI("bdns");
        bdns.getAnchoringServices(dlDomain, (err, anchoringServicesArray) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get anchoring services from bdns`, err));
            }

            if (!anchoringServicesArray.length) {
                return callback('No anchoring service provided');
            }

            callback(undefined, anchoringServicesArray);
        });
    }

    const updateAnchor = (anchorSSI, anchorValue, anchorAction, callback) => {
        if (typeof anchorSSI === "string") {
            try {
                anchorSSI = keySSISpace.parse(anchorSSI);
            } catch (e) {
                return callback(e);
            }
        }

        if (typeof anchorValue === "string") {
            try {
                anchorValue = keySSISpace.parse(anchorValue);
            } catch (e) {
                return callback(e);
            }
        }

        const dlDomain = anchorSSI.getDLDomain();
        const anchorId = anchorSSI.getAnchorId();

        getAnchoringServices(dlDomain, (err, anchoringServicesArray) => {
            if (err) {
                return callback(err);
            }

            const anchorHandler = getAnchorHandler(anchorId, anchorValue.getIdentifier(), dlDomain, anchorAction);
            promiseRunner.runOneSuccessful(anchoringServicesArray, anchorHandler, callback, new Error(`Failed during execution of ${anchorAction}`));
        })
    }

    const getAnchorHandler = (anchorId, anchorValue, dlDomain, anchorAction) => {
        return function (service) {
            return new Promise((resolve, reject) => {
                const putResult = http.doPut(`${service}/anchor/${dlDomain}/${anchorAction}/${anchorId}/${anchorValue}`, "", (err, data) => {
                    if (err) {
                        return reject({
                            statusCode: err.statusCode,
                            message: err.statusCode === 428 ? 'Unable to add alias: versions out of sync' : err.message || 'Error'
                        });
                    }

                    resolver.invalidateDSUCache(anchorId);
                    return resolve(data);
                });
                if (putResult) {
                    putResult.then(resolve).catch(reject);
                }
            })
        }
    };

    this.createAnchor = (capableOfSigningKeySSI, anchorValue, callback) => {
        updateAnchor(capableOfSigningKeySSI, anchorValue, "create-anchor", callback);
    }

    this.appendAnchor = (capableOfSigningKeySSI, anchorValue, callback) => {
        updateAnchor(capableOfSigningKeySSI, anchorValue, "append-to-anchor", callback);
    }

    const getFetchAnchor = (anchorId, dlDomain, actionName, callback) => {
        return function (service) {
            return new Promise((resolve, reject) => {
                http.doGet(`${service}/anchor/${dlDomain}/${actionName}/${anchorId}`, (err, data) => {
                    if (err) {
                        return reject(err);
                    }

                    try{
                        data = JSON.parse(data);
                    }catch (e) {
                        return reject(e);
                    }

                    if (actionName === "get-last-version") {
                        data = data.message;
                    }
                    return resolve(data);
                });
            })
        }
    }

    const getAnchorValues = (keySSI, actionName, callback) => {
        if (typeof keySSI === "string") {
            try {
                keySSI = keySSISpace.parse(keySSI);
            } catch (e) {
                return callback(e);
            }
        }

        const dlDomain = keySSI.getDLDomain();
        const anchorId = keySSI.getAnchorId();
        getAnchoringServices(dlDomain, (err, anchoringServicesArray) => {
            if (err) {
                return callback(err);
            }

            const fetchAnchor = getFetchAnchor(anchorId, dlDomain, actionName, callback);
            promiseRunner.runOneSuccessful(anchoringServicesArray, fetchAnchor, callback, new Error("get Anchoring Service"));
        })
    }

    this.getAllVersions = (keySSI, callback) => {
        getAnchorValues(keySSI, "get-all-versions", callback);
    }

    this.getLastVersion = (keySSI, callback) => {
        getAnchorValues(keySSI, "get-last-version", callback);
    }

    this.createOrUpdateMultipleAnchors = (anchors, callback) => {
        http.doPut(`/anchor/create-or-update-multiple-anchors`, JSON.stringify(anchors), (err, data) => {
            if (err) {
                return callback(err);
            }

            return callback(undefined, data);
        });
    }
}

module.exports = RemotePersistence;