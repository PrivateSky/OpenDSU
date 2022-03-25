/**
 * @module dt
 */


/**
 * Provides a Environment Independent and Versatile Dossier Building API.
 *
 * Meant to be integrated into OpenDSU
 */

/**
 * Returns a DossierBuilder Instance
 * @param {Archive} [sourceDSU] should only be provided when cloning a DSU
 * @param callback
 * @return {DossierBuilder}
 */
const getDossierBuilder = (sourceDSU) => {
    return new (require("./DossierBuilder"))(sourceDSU);
}

const initialiseBuildWallet = (callback) => {
    const BuildWallet = require("./BuildWallet");
    BuildWallet.initialiseWallet(callback);
}

module.exports = {
    getDossierBuilder,
    initialiseBuildWallet,
    Commands: require('./commands'),
    AppBuilderService: require('./AppBuilderService')
}
