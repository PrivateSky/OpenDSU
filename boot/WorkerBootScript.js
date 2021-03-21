function boot(keySSI) {
    const { handleMessage, getInitializeSwarmEngineForKeySSI } = require("./boot-utils.js");

    onmessage = (message) => {
        handleMessage(message.data, (error, result) => {
            postMessage({ error, result });
        });
    };

    function getKeySSI(callback) {
        callback(null, keySSI);
    }

    const BootEngine = require("./BootEngine.js");

    console.log(`[worker] booting DSU for keySSI ${keySSI}...`);

    const initializeSwarmEngine = getInitializeSwarmEngineForKeySSI(keySSI);
    const booter = new BootEngine(getKeySSI, initializeSwarmEngine, ["pskruntime.js", "webshims.js"], ["domain.js"]);

    booter.boot((error) => {
        if (error) {
            postMessage({ error });
            throw error;
        }

        console.log("[worker] ready");
        postMessage("ready");
    });
}

module.exports = boot;
