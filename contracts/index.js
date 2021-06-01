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

                if (Object.keys(response).length === 1 && response.message) {
                    // if the contract returns a string, apihub will put it inside an object with a single property name message
                    // so we extract it
                    return response.message;
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

async function generateNoncedCommand(domain, contractName, methodName, params, signerDID, callback) {
    if (typeof signerDID === "function") {
        callback = signerDID;
        signerDID = params;
        params = null;
    }

    if (typeof params === "function") {
        callback = params;
        signerDID = null;
        params = null;
    }

    if (!signerDID) {
        return callback("signerDID not provided");
    }

    try {
        if (typeof signerDID === "string") {
            // signerDID contains the identifier, so we need to load the DID
            const w3cDID = require("opendsu").loadAPI("w3cDID");
            signerDID = await $$.promisify(w3cDID.resolveDID)(signerDID);
        }

        let nonce;
        const nonceCommandBody = getSafeCommandBody(domain, "consensus", "getNonce", [signerDID.getIdentifier()]);
        try {
            nonce = await $$.promisify(sendCommand)("safe-command", domain, nonceCommandBody);
        } catch (error) {
            return OpenDSUSafeCallback(callback)(
                createOpenDSUErrorWrapper(`Failed to get nonce for command: ${JSON.stringify(nonceCommandBody)}`, error)
            );
        }

        const commandBody = getNoncedCommandBody(domain, contractName, methodName, params, nonce, signerDID);

        sendCommand("nonced-command", commandBody, callback);
    } catch (error) {
        callback(error);
    }
}

module.exports = {
    generateSafeCommand,
    generateNoncedCommand,
};
