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
    };
}

function getNoncedCommandBody(domain, contract, method, params, nonce, signerDID) {
    if (!signerDID) {
        // params field is optional
        signerDID = nonce;
        nonce = params;
        params = null;
    }

    const commandBody = getSafeCommandBody(domain, contract, method, params);
    const paramsString = params ? JSON.stringify(params) : null;
    const fieldsToHash = [domain, contract, method, paramsString, nonce].filter((x) => x != null);
    const hash = fieldsToHash.join(".");
    const signature = signerDID.sign(hash);

    commandBody.nonce = nonce;
    commandBody.signerDID = signerDID.getIdentifier();
    commandBody.requesterSignature = signature;

    return commandBody;
}

module.exports = {
    getSafeCommandBody,
    getNoncedCommandBody,
};
