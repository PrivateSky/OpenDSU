const Interaction = require('./Interaction');
const Promises = require('../../util/Promises');


class Redirect extends Interaction {
    constructor() {
        super(true);
    }


    run(url) {
        window.location = url;
    }


    resume() {
        const {promise, resolve, reject} = Promises.flatPromise();
        this.extractParamsFromContext(location, resolve, reject);
        return promise;
    }
}


module.exports = Redirect;