const getBaseURL = require("../utils/getBaseURL");

async function callContractMethod(domain, contract, method, params, callback) {

    // use bdns service
    // use promise runner - at least one request to succeed

    if (!domain || typeof domain !== "string") {
        return callback(`Invalid domain specified: ${domain}!`);
    }
    if (!contract || typeof contract !== "string") {
        return callback(`Invalid contract specified: ${contract}!`);
    }
    if (!method || typeof method !== "string") {
        return callback(`Invalid method specified: ${method}!`);
    }

    if (typeof params === "function") {
        callback = params;
        params = null;
    }

    if (params) {
        if (!Array.isArray(params)) {
            return callback(`Invalid params specified (must be a list): ${params}!`);
        }

        const crypto = require("opendsu").loadAPI("crypto");
        params = crypto.encodeBase58(JSON.stringify(params));
    }
    
    const contractMethodPath = [domain, contract, method, params]
        .filter((param) => param)
        .map((param) => encodeURIComponent(param))
        .join("/");

    const url = `${getBaseURL()}/contracts/${contractMethodPath}`;

    const http = require("opendsu").loadApi("http");

    try {
        const response = await http.fetch(url);
        let result;
        try {
            result = await response.json();
        } catch (error) {
            // the response is not a valid JSON
        }
        callback(null, result);
    } catch (error) {
        callback(error);
    }
}

module.exports = {
    callContractMethod,
};
