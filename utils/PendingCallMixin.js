function PendingCallMixin(target) {
    let pendingCalls = [];
    let serialPendingCalls = [];
    let isSerialExecutionReady = false;
    let isExecutionReady = false;
    target.addPendingCall = (pendingFn) => {
        if (isExecutionReady) {
            pendingFn();
        } else {
            pendingCalls.push(pendingFn);
        }
    };

    target.executePendingCalls = () => {
        isExecutionReady = true;
        pendingCalls.forEach(fn => fn());
        pendingCalls = [];
    };

    target.addSerialPendingCall = (pendingFn) => {
        serialPendingCalls.push(pendingFn);
        if (isSerialExecutionReady) {
            next();
        }
    };

    function next() {
        const fn = serialPendingCalls.shift();
        if (typeof fn !== "undefined") {
            try {
                fn(function () {
                    setTimeout(() => {
                        next();
                    }, 0);
                });
            } catch (e) {
                console.log(e);
            }
        }
    }

    target.executeSerialPendingCalls = () => {
        isSerialExecutionReady = true;
        next();
    };
}

module.exports = PendingCallMixin;