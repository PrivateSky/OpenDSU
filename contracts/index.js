const getBaseURL = require("../utils/getBaseURL");


const BLOCKCHAIN_REGISTRATION_MODE = {
    OVERWRITE: "overwrite",
    SKIP_EXISTING: "skip",
    UNIQUE: "unique",
};

const registeredBlockchains = {};

function ensureBlockchainForDomain(domainName) {
    if (!registeredBlockchains[domainName]) {
        throw new Error(`No blockchain registered for domain ${domainName}!`);
    }
}

function callReadMethod(domainName, smartContractId, method, ...args) {
    ensureBlockchainForDomain(domainName);
    return registeredBlockchains[domainName].callReadMethod.call(
        registeredBlockchains[domainName],
        smartContractId,
        method,
        ...args
    );
}

function callWriteMethod(domainName, keySSI, smartContractId, method, ...args) {
    ensureBlockchainForDomain(domainName);
    return registeredBlockchains[domainName].callWriteMethod.call(
        registeredBlockchains[domainName],
        keySSI,
        smartContractId,
        method,
        ...args
    );
}

function transferGas(domainName, keySSI, receiver, amount, unitOrDigits) {
    ensureBlockchainForDomain(domainName);
    return registeredBlockchains[domainName].transferGas.call(
        registeredBlockchains[domainName],
        keySSI,
        receiver,
        amount,
        unitOrDigits
    );
}

function registerBlockchain(domainName, strategyFactory, configuration, registrationMode) {
    if (!registrationMode) {
        registrationMode = BLOCKCHAIN_REGISTRATION_MODE.SKIP_EXISTING;
    }

    if (registeredBlockchains[domainName]) {
        const errorMessage = `Blockchain already registered for domain ${domainName}!`;
        console.info(errorMessage, registeredBlockchains[domainName]);

        if (registrationMode === BLOCKCHAIN_REGISTRATION_MODE.UNIQUE) {
            throw new Error(errorMessage);
        }

        if (registrationMode === BLOCKCHAIN_REGISTRATION_MODE.SKIP_EXISTING) {
            return;
        }
    }

    if (typeof strategyFactory !== "function") {
        throw new Error("Should provide a valid strategyFactory");
    }

    const config = {
        ...configuration,
        baseUrl: getBaseURL(),
    };

    registeredBlockchains[domainName] = strategyFactory(config);
}

function createCryptoWallet(domainName) {
    ensureBlockchainForDomain(domainName);
    return registeredBlockchains[domainName].createCryptoWallet.call(registeredBlockchains[domainName]);
}

module.exports = {
    callReadMethod,
    callWriteMethod,
    transferGas,
    registerBlockchain,
    createCryptoWallet,
    BLOCKCHAIN_REGISTRATION_MODE,
};
