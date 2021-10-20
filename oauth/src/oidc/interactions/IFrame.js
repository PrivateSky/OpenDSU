const Promises = require('../../util/Promises');
const Interaction = require('./Interaction');


const IFRAME_ID = 'oidc-sso-iframe';
const IFRAME_STYLE = 'visibility: hidden;';


class IFrame extends Interaction {
    createIFrame(url) {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('id', IFRAME_ID);
        iframe.setAttribute('src', url);
        iframe.setAttribute('style', IFRAME_STYLE);
        iframe.addEventListener('load', () => {
            this.extractParamsFromContext(iframe.contentWindow.location,
                (params) => this.completed(params),
                (err) => this.failed(err));
        });

        document.getElementsByTagName('body')[0].appendChild(iframe);

        setTimeout(() => {
            this.failed(new Error('Loading IFrame timed out'));
        }, 5000);
    }


    cleanUp() {
        const element = document.getElementById(IFRAME_ID);
        element.parentNode.removeChild(element);
    }


    failed(err) {
        if (!this.isCompleted) {
            if (this.reject && typeof this.reject === 'function') {
                this.reject(err);
            }
            this.isCompleted = true;
            this.cleanUp();
        }
    }


    completed(response) {
        if (!this.isCompleted) {
            if (this.resolve && typeof this.resolve === 'function') {
                this.resolve(response);
            }
            this.isCompleted = true;
            this.cleanUp();
        }
    }


    resume() {
    }


    run(url) {
        const {promise, resolve, reject} = Promises.flatPromise();
        this.resolve = resolve;
        this.reject = reject;

        this.createIFrame(url);

        return promise;
    }
}


module.exports = IFrame;