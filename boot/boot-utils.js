function handleMessage(message, onHandleMessage) {
    // console.log("[worker] Received message", message);

    const { fn, api, args } = message;
    const callback = (error, result) => {
        console.log(`[worker] finished work ${message}`, error, result);

        // if the result is a HashLinkSSI then we need to "serialize" it because the default worker copy mechanism doesn't handle complex types
        // (HashLinkSSI is an object which contains functions and they cannot be serialized)
        if (result && result.constructor && result.constructor.name === "HashLinkSSI") {
            result = {
                type: "HashLinkSSI",
                identifier: result.getIdentifier(),
            };
        }

        onHandleMessage(error, result);
    };
    try {
        const dsuArgs = [...args, callback];

        if (api) {
            // need to call the DSU's api.js method
            this.rawDossier.call(api, ...dsuArgs);
            return;
        }

        if (fn) {
            this.rawDossier[fn].apply(this.rawDossier, dsuArgs);
            return;
        }

        callback(new Error(`Received unknown task: ${JSON.stringify(message)}`));
    } catch (error) {
        onHandleMessage(error);
    }
}

function getInitializeSwarmEngineForKeySSI() {
    return (callback) => {
        global.rawDossier.start((err) => {
            if (err) {
                return callback(err);
            }
            callback(undefined);
        });
    };
}

module.exports = {
    handleMessage,
    getInitializeSwarmEngineForKeySSI,
};
