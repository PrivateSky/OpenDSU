function startTransaction(transactionName, ...args) {
    const callArgs = [...args];
    const callback = callArgs.pop();

    console.log(`Starting transaction ${transactionName}...`, callArgs);
    const transaction = $$.blockchain.startTransactionAs("worker", transactionName, ...callArgs);
    console.log('transaction', transaction);
    transaction.onReturn((err, result) => {
        console.log('transaction returned', err, result)
        callback(err, result);
    });
}

function lookup(...args) {
    const callArgs = [...args];
    const callback = callArgs.pop();

    const result = $$.blockchain.lookup(...callArgs);
    callback(undefined, result);
}

const ledgerMethods = {
    startTransaction,
    lookup
};

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
        const methodArgs = [...args, callback];

        if (api) {
            // need to call the DSU's api.js method
            this.rawDossier.call(api, ...methodArgs);
            return;
        }

        if (fn && typeof this.rawDossier[fn] === "function") {
            this.rawDossier[fn].apply(this.rawDossier, methodArgs);
            return;
        }

        if (ledgerMethods[fn]) {
            ledgerMethods[fn].apply(this.rawDossier, methodArgs);
            return;
        }

        callback(new Error(`Received unknown task: ${JSON.stringify(message)}`));
    } catch (error) {
        onHandleMessage(error);
    }
}

function getInitializeSwarmEngineForKeySSI() {
    return (callback) => {
        console.log('getInitializeSwarmEngineForKeySSI', $$.blockchain);
        if ($$.blockchain) {
            // blockchain was set by a runtimeBundles module so we need to start the given blockchain
            console.log('Starting custom blockchain...')
            return $$.blockchain.start(callback);
        }

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
