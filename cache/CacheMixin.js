function CacheMixin(target){
    let pendingCalls = [];

    target.addPendingCall = (pendingFn) => {
        pendingCalls.push(pendingFn);
    };

    target.executePendingCalls = () => {
        pendingCalls.forEach(fn => fn());
        pendingCalls = [];
    };
}

module.exports = CacheMixin;