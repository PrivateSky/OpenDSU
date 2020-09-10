const bdns = require("bdns").createBDNS();

const getRawInfo = (keySSI, callback) => {
    bdns.getRawInfo(keySSI, callback);
};

const getBrickStorages = (keySSI, callback) => {
    bdns.getBrickStorages(keySSI, callback);
};

const getAnchoringServices = (keySSI, callback) => {
    bdns.getAnchoringServices(keySSI, callback);
};

const getReplicas = (keySSI, callback) => {
    bdns.getReplicas(keySSI, callback);
};

const addRawInfo = (keySSI, rawInfo) => {
    bdns.addRawInfo(keySSI.getDLDomain(), rawInfo);
};

const addAnchoringServices = (keySSI, anchoringServices) => {
    bdns.addAnchoringServices(keySSI.getDLDomain(), anchoringServices);
};

const addBrickStorages = (keySSI, brickStorages) => {
    bdns.addBrickStorages(keySSI.getDLDomain(), brickStorages);
};

const addReplicas = (keySSI, replicas) => {
    bdns.addReplicas(keySSI.getDLDomain(), replicas);
};

module.exports = {
    getRawInfo,
    getBrickStorages,
    getAnchoringServices,
    getReplicas,
    addRawInfo,
    addAnchoringServices,
    addBrickStorages,
    addReplicas
}