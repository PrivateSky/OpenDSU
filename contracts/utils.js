const { fetch, doPost } = require("../http");
const promiseRunner = require("../utils/promise-runner");

class DomainNotSupportedError extends Error {
    constructor(domain, url) {
        super(`Domain '${domain}' not supported for calling URL ${url}`);
        this.name = "DomainNotSupportedError";
    }
}

function getCommandHash(command) {
    const { domain, contractName, methodName, params, type, blockNumber, timestamp } = command;

    const objectToHash = {
        domain,
        contractName,
        methodName,
        params,
    };

    if (type === "nonced") {
        objectToHash.blockNumber = blockNumber;
        objectToHash.timestamp = timestamp;
    }

    const crypto = require("opendsu").loadApi("crypto");
    const hash = crypto.sha256(objectToHash);

    return hash;
}

function getSafeCommandBody(domain, contractName, methodName, params) {
    if (!domain || typeof domain !== "string") {
        throw `Invalid domain specified: ${domain}!`;
    }
    if (!contractName || typeof contractName !== "string") {
        throw `Invalid contractName specified: ${contractName}!`;
    }
    if (!methodName || typeof methodName !== "string") {
        throw `Invalid methodName specified: ${methodName}!`;
    }

    if (params) {
        if (!Array.isArray(params)) {
            throw `Invalid params specified (must be a list): ${params}!`;
        }
    }

    return {
        domain,
        contractName,
        methodName,
        params,
        type: "safe",
    };
}

function getNoncedCommandBody(domain, contract, method, params, blockNumber, timestamp, signerDID) {
    if (!signerDID) {
        // params field is optional
        signerDID = timestamp;
        timestamp = blockNumber;
        blockNumber = params;
        params = null;
    }

    const commandBody = getSafeCommandBody(domain, contract, method, params);
    commandBody.type = "nonced";
    commandBody.blockNumber = blockNumber;
    commandBody.timestamp = timestamp;
    commandBody.signerDID = signerDID.getIdentifier();

    const hash = getCommandHash(commandBody);
    const signature = signerDID.sign(hash);

    commandBody.requesterSignature = signature;

    return commandBody;
}

function getContractEndpointUrl(baseUrl, domain, contractEndpointPrefix) {
    return `${baseUrl}/contracts/${domain}/${contractEndpointPrefix}`;
}

async function callContractEndpoint(url, method, domain, body) {
    let response;
    if (method === "GET") {
        response = await fetch(url);
        if (response.statusCode === 404) {
            throw new DomainNotSupportedError(domain, url);
        }

        response = await response.json();
    } else {
        try {
            response = await $$.promisify(doPost)(url, body);
        } catch (error) {
            if (error.statusCode === 404) {
                throw new DomainNotSupportedError(domain, url);
            }
            throw error;
        }
    }

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
}

async function callContractEndpointUsingBdns(method, contractEndpointPrefix, domain, commandBody, callback) {
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
        const url = getContractEndpointUrl(service, domain, contractEndpointPrefix);
        const response = await callContractEndpoint(url, method, domain, commandBody);
        return response;
    };

    promiseRunner.runOneSuccessful(contractServicesArray, runContractMethod, callback, new Error("get Contract Service"));
}

module.exports = {
    DomainNotSupportedError,
    getSafeCommandBody,
    getNoncedCommandBody,
    getContractEndpointUrl,
    callContractEndpoint,
    callContractEndpointUsingBdns,
};
