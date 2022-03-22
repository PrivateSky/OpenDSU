/**
 * @module Commands
 */

/**
 * cache of node's fs object
 */

let _fileSystem = undefined;

/**
 * Caches and returns node's fs object if the environment is right
 * @return {fs}
 */
const _getFS = function () {
    if ($$.environmentType !== 'nodejs')
        throw new Error("Wrong environment for this function. Please make sure you know what you are doing...");
    if (!_fileSystem)
        _fileSystem = require('fs');
    return _fileSystem;
}

/**
 * Provides Util functions and Methods as well as caching for the open DSU resolver and {@Link DSUBuilder}
 */

let resolver, keyssi, sharedEnclave;

/**
 * Wrapper around
 * <pre>
 *     OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(msg, err));
 * </pre>
 * @param msg
 * @param err
 * @param callback
 * @protected
 */
const _err = function (msg, err, callback) {
    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(msg, err));
}

/**
 * for singleton use
 * @returns {function} resolver api
 */
const _getResolver = function (callback) {
    if (!resolver) {
        const scAPI = require("opendsu").loadAPI("sc");
        if (!scAPI.sharedEnclaveExists()) {
            resolver = require('opendsu').loadApi('resolver');
            return callback(undefined, resolver);
        }
        _getSharedEnclave(callback);
        return;
    }
    callback(undefined, resolver);
}

/**
 * for singleton use
 * @returns {function} keyssi api
 */
const _getKeySSISpace = function () {
    if (!keyssi)
        keyssi = require('opendsu').loadApi('keyssi');
    return keyssi;
}

/**
 * for singleton use
 * @returns {function} sc api
 */
const _getSharedEnclave = function (callback) {
    if (!sharedEnclave) {
        const scAPI = require('opendsu').loadApi('sc');
        scAPI.getSharedEnclave((err, _sharedEnclave) => {
            if (err) {
                return callback(err);
            }

            sharedEnclave = _sharedEnclave;
            callback(undefined, sharedEnclave);
        })
        return;
    }
    callback(undefined, sharedEnclave);
}

const KEY_TYPE = {
    ARRAY: "array",
    SEED: "seed",
    WALLET: 'wallet'
}

const DSU_TYPE = {
    CONST: "const",
    WALLET: "wallet",
    SEED: "seed"
}

module.exports = {
    _getFS,
    _getResolver,
    _getKeySSISpace,
    _getSharedEnclave,
    _err,
    KEY_TYPE,
    DSU_TYPE
};