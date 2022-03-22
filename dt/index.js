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
const getDossierBuilder = (sourceDSU, callback) => {
    if (typeof sourceDSU === "function") {
        callback = sourceDSU;
        sourceDSU = undefined;
    }
    const BuildWallet = require("./BuildMainDSU");
    BuildWallet.initialiseWallet(err => {
        if (err) {
            return callback(err);
        }
        const dossierBuilder = new (require("./DossierBuilder"))(sourceDSU);
        callback(undefined, dossierBuilder);
    })
}

module.exports = {
    getDossierBuilder,
    Commands: require('./commands'),
    AppBuilderService: require('./AppBuilderService')
}
