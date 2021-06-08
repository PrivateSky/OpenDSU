const promiseRunner = require("../utils/promise-runner");
const { doPost } = require("../http");

const { getSafeCommandBody, getNoncedCommandBody } = require("./utils");

async function sendCommand(contractEndpointPrefix, commandBody, callback) {
    try {
        const { domain } = commandBody;
        let contractServicesArray = [];
        try {
            const bdns = require("opendsu").loadApi("bdns");
            contractServicesArray = await $$.promisify(bdns.getContractServices)(domain);
        } catch (error) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get contract services from bdns'`, error));
        }

        if (!contractServicesArray.length) {
            return callback("No contract service provided");
        }

        const runContractMethod = async (service) => {
            const url = `${service}/contracts/${domain}/${contractEndpointPrefix}`;
            let response = await $$.promisify(doPost)(url, commandBody);

            if (response) {
                try {
                    response = JSON.parse(response);
                } catch (error) {
                    // the response isn't a JSON so we keep it as it is
                }

                if (response.optimisticResult) {
                    try {
                        response.optimisticResult = JSON.parse(response.optimisticResult);
                    } catch (error) {
                        // the response isn't a JSON so we keep it as it is
                    }
                }
            }

            return response;
        };

        promiseRunner.runOneSuccessful(contractServicesArray, runContractMethod, callback, new Error("get Contract Service"));
    } catch (error) {
        OpenDSUSafeCallback(callback)(
            createOpenDSUErrorWrapper(`Failed to execute domain contract method: ${JSON.stringify(commandBody)}`, error)
        );
    }
}

function generateSafeCommand(domain, contractName, methodName, params, callback) {
    if (typeof params === "function") {
        callback = params;
        params = null;
    }

    try {
        const commandBody = getSafeCommandBody(domain, contractName, methodName, params);
        sendCommand("safe-command", commandBody, callback);
    } catch (error) {
        callback(error);
    }
}

async function generateNoncedCommand(signerDID, domain, contractName, methodName, params, timestamp, callback) {
    if (typeof timestamp === "function") {
        callback = timestamp;

        // check if the param before provided callback is either the timestamp or the params, since both are optional
        if (typeof params === "number") {
            timestamp = params;
            params = null;
        } else {
            timestamp = null;
        }
    }

    if (typeof params === "function") {
        callback = params;
        params = null;
        timestamp = null;
    }
    if (!signerDID) {
        return callback("signerDID not provided");
    }

    if (!timestamp) {
        timestamp = Date.now();
    }

    try {
        if (typeof signerDID === "string") {
            // signerDID contains the identifier, so we need to load the DID
            const w3cDID = require("opendsu").loadAPI("w3cdid");
            signerDID = await $$.promisify(w3cDID.resolveDID)(signerDID);
        }

        const commandBody = getNoncedCommandBody(domain, contractName, methodName, params, timestamp, signerDID);
        sendCommand("nonced-command", commandBody, callback);
    } catch (error) {
        callback(error);
    }
}

module.exports = {
    generateSafeCommand,
    generateNoncedCommand,
};
