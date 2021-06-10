module.exports = () => {
    addEventListener('message', (event) => {
        const { functionName, payload } = event.data;

        console.log(`[workers] web worker activated by function "${functionName}"`);

        try {
            const result = require("opendsu").loadAPI("workers").getFunctionsRegistry()[functionName](payload);
            postMessage({ result });
        } catch (error) {
            postMessage({ error });
        }
    });

    addEventListener('error', (event) => {
        const error = event.data;

        console.error("[workers] web worker error", error);
    });
}