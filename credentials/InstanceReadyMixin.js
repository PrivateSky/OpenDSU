function InstanceReadyMixin(target) {

    target.isInstanceReady = false;
    target.instanceReadyCallback = null;

    target.onInstanceReady = (callback) => {
        if (target.isInstanceReady) {
            callback(...target.args);
            target.args = null;
            return;
        }

        target.instanceReadyCallback = callback;
    };

    target.notifyInstanceReady = (...args) => {
        target.isInstanceReady = true;
        if (typeof target.instanceReadyCallback === "function") {
            target.instanceReadyCallback(...args);
            target.isInstanceReady = false;
            target.instanceReadyCallback = null;
        } else {
            target.args = [...args];
        }
    }
}

module.exports = InstanceReadyMixin;