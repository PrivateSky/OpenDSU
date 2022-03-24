/**
 * @module dt
 */


/**
 * Provides a Environment Independent and Versatile Dossier Building API.
 *
 * Meant to be integrated into OpenDSU
 */

const BuildWallet = require("./BuildMainDSU");
/**
 * Returns a DossierBuilder Instance
 * @param {Archive} [sourceDSU] should only be provided when cloning a DSU
 * @param callback
 * @return {DossierBuilder}
 */
const getDossierBuilder = (sourceDSU) => {
    return new (require("./DossierBuilder"))(sourceDSU);
}

const getDossierBuilderAsync = (sourceDSU, callback) => {
    if (typeof sourceDSU === "function") {
        callback = sourceDSU;
        sourceDSU = undefined;
    }
    initialiseBuildWallet(err => {
        if (err) {
            return callback(err);
        }
        const dossierBuilder = new (require("./DossierBuilder"))(sourceDSU);
        callback(undefined, dossierBuilder);
    })
}

const initialiseBuildWallet = (callback) => {
    const BuildWallet = require("./BuildMainDSU");
    BuildWallet.initialiseWallet(callback);
}

module.exports = {
    getDossierBuilder,
    initialiseBuildWallet,
    getDossierBuilderAsync,
    Commands: require('./commands'),
    AppBuilderService: require('./AppBuilderService')
}
