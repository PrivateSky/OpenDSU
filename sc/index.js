const getMainDSU = () => {
    if (typeof rawDossier === "undefined") {
        throw Error("Main DSU does not exist in the current context.");
    }

    return rawDossier;
};

module.exports = {
    getMainDSU
}