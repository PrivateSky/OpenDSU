/*
    Security Context related functionalities

 */

const getMainDSU = () => {

    if (!globalVariableExists("rawDossier")) {
        throw Error("Main DSU does not exist in the current context.");
    }
    return getGlobalVariable("rawDossier");
};

const setMainDSU = (mainDSU) => {
    return setGlobalVariable("rawDossier", mainDSU);
};

module.exports = {
    getMainDSU,
    setMainDSU
}