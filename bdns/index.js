if (typeof bdns === "undefined") {
    bdns = require("bdns").create();
}
const getRawInfo = (dlDomain, callback) => {
    bdns.getRawInfo(dlDomain, callback);
};

const getBrickStorages = (dlDomain, callback) => {
    bdns.getBrickStorages(dlDomain, callback);
};

const getAnchoringServices = (dlDomain, callback) => {
    bdns.getAnchoringServices(dlDomain, callback);
};

const getReplicas = (dlDomain, callback) => {
    bdns.getReplicas(dlDomain, callback);
};

const addRawInfo = (dlDomain, rawInfo) => {
    bdns.addRawInfo(dlDomain, rawInfo);
};

const addAnchoringServices = (dlDomain, anchoringServices) => {
    bdns.addAnchoringServices(dlDomain, anchoringServices);
};

const addBrickStorages = (dlDomain, brickStorages) => {
    bdns.addBrickStorages(dlDomain, brickStorages);
};

const addReplicas = (dlDomain, replicas) => {
    bdns.addReplicas(dlDomain, replicas);
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