function startTransaction(transactionName, ...args) {
    const callArgs = [...args];
    const callback = callArgs.pop();

    console.log(`Starting transaction ${transactionName}...`, callArgs);
    const transaction = $$.blockchain.startTransactionAs("worker", transactionName, ...callArgs);
    transaction.onReturn((err, result) => {
        callback(err, result);
    });
}

const ledgerMethods = {
    startTransaction
};

function handleMessage(message, onHandleMessage) {
    const { fn, api, args } = message;
    const callback = (error, result) => {
        console.log(`[worker] finished work ${message}`, error, result);

        // in order to ensure result serializability we JSON.stringify it if isn't a Buffer
        if (!$$.Buffer.isBuffer(result)) {
            result = JSON.stringify(result);
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
        if ($$.blockchain) {
            // blockchain was set by a runtimeBundles module so we need to start the given blockchain
            console.log("Starting custom blockchain...");
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
