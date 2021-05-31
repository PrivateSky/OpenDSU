function getSafeCommandBody(domain, contract, method, params) {
    if (!domain || typeof domain !== "string") {
        throw `Invalid domain specified: ${domain}!`;
    }
    if (!contract || typeof contract !== "string") {
        throw `Invalid contract specified: ${contract}!`;
    }
    if (!method || typeof method !== "string") {
        throw `Invalid method specified: ${method}!`;
    }

    if (params) {
        if (!Array.isArray(params)) {
            throw `Invalid params specified (must be a list): ${params}!`;
        }
    }

    return {
        contract,
        method,
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
    commandBody.signature = signature;

    return commandBody;
}

module.exports = {
    getSafeCommandBody,
    getNoncedCommandBody,
};
