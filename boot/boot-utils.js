function handleMessage(message, onHandleMessage) {
    // console.log("[worker] Received message", message);

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

module.exports = {
    handleMessage,
};
