const bdns = require("../index").loadApi("bdns");
const { fetch, doPut } = require('../http');

const versions = (keySSI, authToken, callback) => {
    const anchoringServicesArray = bdns.getAnchoringServices(keySSI);

    if (!anchoringServicesArray.length) {
        return callback('No anchoring service provided');
    }

    const queries = anchoringServicesArray.map((service) => fetch(`${service}/anchor/versions/${keySSI.getAnchorAlias()}`));

    Promise.any(queries).then((response) => {
        response.json().then((data) => callback(null, data))
    }).catch((err) => callback(err));
};

const addAnchor = (keySSI, hashLinkSSI, authToken, callback) => {
    const anchoringServicesArray = bdns.getAnchoringServices(keySSI);

    // const options = {
    //     method: 'PUT',
    //     body: brick
    // };
    // const queries = brickStorageArray.map((storage) => fetch(`${brickStorageArray[0]}/put-brick/${brickHash}`, options));

    const queries = anchoringServicesArray.map((service) => {
        return new Promise((resolve, reject) => {
            doPut(`${service}/anchor/${keySSI.getAnchorAlias()}`, hashLinkSSI.getHash(), resolve)
        })
    })
    Promise.allSettled(queries).then((rawResponses) => {
        Promise.all(rawResponses.find((rawResponse) => rawResponse.status === 201).json()).then((response) => {
            return callback(null, response)
        });
    });
};

module.exports = {
    addAnchor,
    versions
}