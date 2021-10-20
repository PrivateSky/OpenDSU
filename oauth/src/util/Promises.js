function flatPromise() {
    let resolve, reject;
    let promise = new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });

    return {promise, resolve, reject};
}


module.exports = {
    flatPromise
}