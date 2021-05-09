const promiseRunner = require("../utils/promise-runner");
const { fetch } = require("../http");

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

    try {
        let contractServicesArray = [];
        try {
            const bdns = require("opendsu").loadApi("bdns");
            contractServicesArray = await $$.promisify(bdns.getContractServices)(domain);
        } catch (error) {
            return OpenDSUSafeCallback(callback)(
                createOpenDSUErrorWrapper(`Failed to get contract services from bdns'`, error)
            );
        }

        if (!contractServicesArray.length) {
            return callback("No contract service provided");
        }

        const runContractMethod = async (service) => {
            console.log("caallling");
            const response = await fetch(`${service}/contracts/${contractMethodPath}`);
            let result;
            try {
                result = await response.json();
            } catch (error) {
                // the response is not a valid JSON
            }
            return result;
        };

        promiseRunner.runOneSuccessful(
            contractServicesArray,
            runContractMethod,
            callback,
            new Error("get Contract Service")
        );
    } catch (error) {
        console.log("eeeeee", error);
        OpenDSUSafeCallback(callback)(
            createOpenDSUErrorWrapper(
                `Failed to call method '${method}' from '${contract}' contract from domain '${domain}'`,
                error
            )
        );
    }
}

module.exports = {
    callContractMethod,
};
