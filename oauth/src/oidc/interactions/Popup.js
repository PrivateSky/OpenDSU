const Interaction = require('./Interaction');
const Promises = require('../../util/Promises');


const POPUP_NAME = 'oidc-sso-popup';
const POPUP_FEATURES = 'height=600,width=800';


class Popup extends Interaction {
    run(url) {
        const {promise, resolve, reject} = Promises.flatPromise();

        window.popupCompleted = () => {
            popupWindow.completed = true;
            this.extractParamsFromContext(popupWindow.location, resolve, reject);
        }

        const popupWindow = window.open(url, POPUP_NAME, POPUP_FEATURES);
        if (popupWindow === null) {
            throw new Error('Error loading authentication popup window');
        }

        const popupInterval = setInterval(() => {
            if (popupWindow.closed && !popupWindow.completed) {
                clearInterval(popupInterval);
                reject(new Error('Authentication popup window closed'));
            }
        });

        if (window.focus) {
            popupWindow.focus()
        }

        return promise;
    }


    cleanUp() {
        window.opener.popupCompleted();
        window.close();
    }


    resume() {
        if (window.opener) {
            this.cleanUp();
        } else {
            window.onload = () => this.cleanUp();
        }
    }
}


module.exports = Popup;