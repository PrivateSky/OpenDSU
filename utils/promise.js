function promisify(fn) {
    return function (...args) {
        return new Promise((resolve, reject) => {
            fn(...args, (err, ...res) => {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    resolve(...res);
                }
            });
        });
    };
}

module.exports = {
    promisify,
};
