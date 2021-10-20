const Browser = require('../../util/Browser');


class Interaction {
    constructor(allowResumeAuthentication = false) {
        this.allowResumeAuthentication = allowResumeAuthentication;
    }


    extractParamsFromContext(context, resolve, reject) {
        let params = null;
        try {
            if (context.hash) {
                params = Browser.parseUrlHash(context.hash);
            } else if (context.search) {
                params = Browser.parseUrlQuery(context.search);
            }

            if (params !== null) {
                resolve(params);
            } else {
                reject(new Error(`Failed to extract params value from context[${this.constructor.name}]`))
            }
        } catch (err) {
            reject(err);
        }
    }
}


module.exports = Interaction;