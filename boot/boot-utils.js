function handleMessage(message, onHandleMessage) {
    // console.log("[worker] Received message", message);

    const { fn, args } = message;
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
        this.rawDossier[fn].apply(this.rawDossier, [...args, callback]);
    } catch (error) {
        onHandleMessage(error);
    }
}

function getInitializeSwarmEngineForKeySSI(keySSI) {
    const openDSU = require("opendsu");
    const resolver = openDSU.loadApi("resolver");

    return (callback) => {
        resolver.loadDSU(keySSI, (err, rawDossier) => {
            if (err) {
                return callback(err);
            }

            rawDossier.start((err) => {
                if (err) {
                    return callback(err);
                }
                callback(undefined);
            });
        });
    };
}

module.exports = {
    handleMessage,
    getInitializeSwarmEngineForKeySSI,
};
