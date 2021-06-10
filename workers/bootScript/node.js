module.exports = () => {
    const worker_threads = "worker_threads";
    const { parentPort } = require(worker_threads);

    parentPort.postMessage("ready");

    parentPort.on("message", ({ functionName, payload }) => {
        console.log(`[workers] node worker activated by function "${functionName}"`);

        try {
            const result = require("opendsu").loadAPI("workers").getFunctionsRegistry()[functionName](payload);
            parentPort.postMessage({ result });
        } catch (error) {
            parentPort.postMessage({ error });
        }
    });

    process.on("uncaughtException", (error) => {
        console.error("[workers] uncaughtException inside node worker", error);

        setTimeout(() => process.exit(1), 100);
    });
}