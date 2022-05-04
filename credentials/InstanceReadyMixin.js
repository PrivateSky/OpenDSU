function InstanceReadyMixin(target) {

    target.isInstanceReady = false;
    target.instanceReadyCallback = null;

    target.onInstanceReady = (callback) => {
        if (target.isInstanceReady) {
            return callback(...target.args);
        }

        target.instanceReadyCallback = callback;
    };

    target.notifyInstanceReady = (...args) => {
        target.isInstanceReady = true;
        if (typeof target.instanceReadyCallback === "function") {
            target.instanceReadyCallback(...args);
        } else {
            target.args = [...args];
        }
    }
}

module.exports = InstanceReadyMixin;