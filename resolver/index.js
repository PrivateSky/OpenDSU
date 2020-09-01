const EDFS = require("edfs");

const createDSU = (dsuRepresentationName, callback) => {
    EDFS.createDSU(dsuRepresentationName, callback);
};

const loadDSU = (keySSI, callback) => {
    EDFS.resolveSSI(keySSI, keySSI.getDSURepresentationName(), callback);
};

const createCustomDSU = () => {

};

const getHandler = () => {

};

module.exports = {
    createDSU,
    loadDSU,
    createCustomDSU,
    getHandler
}