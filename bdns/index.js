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

module.exports = {
    getRawInfo,
    getBrickStorages,
    getAnchoringServices,
    getReplicas
}