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

function getNoncedCommandBody(domain, contract, method, params, timestamp, signerDID) {
    if (!signerDID) {
        // params field is optional
        signerDID = timestamp;
        timestamp = params;
        params = null;
    }

    const commandBody = getSafeCommandBody(domain, contract, method, params);
    commandBody.type = "nonced";
    commandBody.timestamp = timestamp;
    commandBody.signerDID = signerDID.getIdentifier();

    const bricksledger = require("bricksledger");
    const command = bricksledger.createCommand(commandBody);

    const hash = command.getHash();
    const signature = signerDID.sign(hash);

    commandBody.requesterSignature = signature;

    return commandBody;
}

module.exports = {
    getSafeCommandBody,
    getNoncedCommandBody,
};
