function getURLForSsappContext(relativePath) {
    if (window["$$"] && $$.SSAPP_CONTEXT && $$.SSAPP_CONTEXT.BASE_URL && $$.SSAPP_CONTEXT.SEED) {
        // if we have a BASE_URL then we prefix the fetch url with BASE_URL
        return `${new URL($$.SSAPP_CONTEXT.BASE_URL).pathname}${
            relativePath.indexOf("/") === 0 ? relativePath.substring(1) : relativePath
        }`;
    }
    return relativePath;
}

module.exports = {
    getURLForSsappContext
}
