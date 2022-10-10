/**
 * @module Commands
 * @memberOf dt
 */

/**
 */
const Command = require('./Command');
const { _getKeySSISpace, _err } = require('./utils');

/**
 * Derives the provided keySSI
 *
 * @class DeriveCommand
 */
class DeriveCommand extends Command{
    constructor(varStore) {
        super(varStore);
    }

    _parseCommand(command, next, callback) {
        if (!callback){
            callback = next;
            next = undefined;
        }
        callback(undefined, command
            ? !(command === 'false' || command[0] === 'false')
            : true);
    }

    /**
     * derives the provided keySSI (in the source object)
     * @param {object} arg unused
     * @param {KeySSI} bar
     * @param {object} options unsused
     * @param {function(err, KeySSI)} callback
     * @protected
     */
    _runCommand(arg, bar, options, callback) {
        if (!callback) {
            callback = options;
            options = undefined;
        }

        try{
            const keySSI = _getKeySSISpace().parse(bar);
            keySSI.derive((err, derivedKeySSI) => {
                if (err) {
                    return _err(`Could not derive Key ${JSON.stringify(bar)}`, err, callback)
                }

                callback(undefined, arg ? derivedKeySSI.getIdentifier() : derivedKeySSI);
            });
        } catch (e) {
            _err(`Could not parse Key ${JSON.stringify(bar)}`, e, callback)
        }
    }
}

module.exports = DeriveCommand;