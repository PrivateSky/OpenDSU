const keySSIResolver = require("key-ssi-resolver");
const crypto = require("../crypto");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;
const dbAPI = require("opendsu").loadAPI("db");
const parse = (ssiString, options) => {
    return keySSIFactory.create(ssiString, options);
};

const createSeedSSI = (domain, vn, hint, callback) => {
    return we_createSeedSSI(dbAPI.getMainEnclave(), domain, vn, hint, callback);
};

const we_createSeedSSI = (enclave, domain, vn, hint, callback) => {
    if (typeof vn == "function") {
        callback = vn;
        vn = undefined;
    }

    if (typeof hint == "function") {
        callback = hint;
        hint = undefined;
    }

    let seedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);

    if (typeof callback === "function") {
        seedSSI.initialize(domain, undefined, undefined, vn, hint, (err => {
            if (err) {
                return callback(err);
            }

            if (enclave) {
                enclave.storeKeySSI(seedSSI, (err) => callback(err, seedSSI));
            } else {
                callback(undefined, seedSSI);
            }
        }));
    } else {
        seedSSI.initialize(domain, undefined, undefined, vn, hint);
    }
    return seedSSI;
};

const buildSeedSSI = function () {
    throw new Error("Obsoleted, use buildTemplateSeedSSI");
}

const buildTemplateSeedSSI = (domain, specificString, control, vn, hint, callback) => {
    console.log("This function is obsolete. Use createTemplateSeedSSI instead.");
    return createTemplateKeySSI(SSITypes.SEED_SSI, domain, specificString, control, vn, hint, callback);
};

const createTemplateSeedSSI = (domain, specificString, control, vn, hint, callback) => {
    return createTemplateKeySSI(SSITypes.SEED_SSI, domain, specificString, control, vn, hint, callback);
};

const createHashLinkSSI = (domain, hash, vn, hint) => {
    const hashLinkSSI = keySSIFactory.createType(SSITypes.HASH_LINK_SSI)
    hashLinkSSI.initialize(domain, hash, vn, hint);
    return hashLinkSSI;
};

const createTemplateKeySSI = (ssiType, domain, specificString, control, vn, hint, callback) => {
    //only ssiType and domain are mandatory arguments
    if (typeof specificString === "function") {
        callback = specificString;
        specificString = undefined;
    }
    if (typeof control === "function") {
        callback = control;
        control = undefined;
    }
    if (typeof vn === "function") {
        callback = vn;
        specificString = undefined;
    }
    if (typeof hint === "function") {
        callback = hint;
        hint = undefined;
    }
    const keySSI = keySSIFactory.createType(ssiType);
    keySSI.load(ssiType, domain, specificString, control, vn, hint);
    if (typeof callback === "function") {
        callback(undefined, keySSI);
    }
    return keySSI;
};

const buildTemplateWalletSSI = (domain, arrayWIthCredentials, hint) => {
    console.log("This function is obsolete. Use createTemplateWalletSSI instead.");
    try {
        let ssi = createArraySSI(domain, arrayWIthCredentials, undefined, hint);
        ssi.cast(SSITypes.WALLET_SSI);
        return parse(ssi.getIdentifier());
    } catch (err) {
        console.log("Failing to build WalletSSI");
    }
};

const createTemplateWalletSSI = (domain, arrayWIthCredentials, hint) => {
    try {
        let ssi = createArraySSI(domain, arrayWIthCredentials, undefined, hint);
        ssi.cast(SSITypes.WALLET_SSI);
        return parse(ssi.getIdentifier());
    } catch (err) {
        console.log("Failing to build WalletSSI");
    }
};

const createConstSSI = (domain, constString, vn, hint) => {
    return we_createConstSSI(dbAPI.getMainEnclave(), domain, constString, vn, hint)
};

const we_createConstSSI = (enclave, domain, constString, vn, hint, callback) => {
    const constSSI = keySSIFactory.createType(SSITypes.CONST_SSI);
    constSSI.initialize(domain, constString, vn, hint);
    if (typeof callback === "function") {
        if (enclave) {
            enclave.storeKeySSI(undefined, constSSI, callback);
        } else {
            callback(undefined, constSSI);
        }
    }
    return constSSI;
};

const createArraySSI = (domain, arr, vn, hint, callback) => {
    return we_createArraySSI(dbAPI.getMainEnclave(), domain, arr, vn, hint);
}

const we_createArraySSI = (enclave, domain, arr, vn, hint, callback) => {
    const arraySSI = keySSIFactory.createType(SSITypes.ARRAY_SSI);
    arraySSI.initialize(domain, arr, vn, hint);
    if (typeof callback === "function") {
        if (enclave) {
            enclave.storeKeySSI(undefined, arraySSI, callback);
        } else {
            callback(undefined, arraySSI);
        }
    }
    return arraySSI;
};

const buildSymmetricalEncryptionSSI = (domain, encryptionKey, control, vn, hint, callback) => {
    console.log("This function is obsolete. Use createTemplateSymmetricalEncryptionSSI instead.");
    return createTemplateKeySSI(SSITypes.SYMMETRICAL_ENCRYPTION_SSI, domain, encryptionKey, control, vn, hint, callback);
};

const createTemplateSymmetricalEncryptionSSI = (domain, encryptionKey, control, vn, hint, callback) => {
    return createTemplateKeySSI(SSITypes.SYMMETRICAL_ENCRYPTION_SSI, domain, encryptionKey, control, vn, hint, callback);
};

const createToken = (domain, amountOrSerialNumber, vn, hint, callback) => {
    if (typeof vn === "function") {
        callback = vn;
        vn = undefined;
        hint = undefined
    }

    if (typeof hint === "function") {
        callback = hint;
        hint = undefined
    }
    // the tokenSSI is closely linked with an ownershipSSI
    // the tokenSSI must have the ownershipSSI's public key hash
    // the ownershipSSI must have the tokenSSI's base58 ssi
    const ownershipSSI = keySSIFactory.createType(SSITypes.OWNERSHIP_SSI);
    ownershipSSI.initialize(domain, undefined, undefined, vn, hint, (err) => {

        const ownershipPublicKeyHash = ownershipSSI.getPublicKeyHash();
        const ownershipPrivateKey = ownershipSSI.getPrivateKey();

        const tokenSSI = keySSIFactory.createType(SSITypes.TOKEN_SSI);
        tokenSSI.initialize(domain, amountOrSerialNumber, ownershipPublicKeyHash, vn, hint);

        // update ownershipSSI to set level and token
        const ownershipLevelAndToken = `0/${tokenSSI.getIdentifier()}`;
        ownershipSSI.load(SSITypes.OWNERSHIP_SSI, domain, ownershipPrivateKey, ownershipLevelAndToken, vn, hint);

        // create a TRANSFER_SSI, since the token's ownership is first transfered to the owner itself
        const transferTimestamp = new Date().getTime();

        // get signature by sign(lastEntryInAnchor, transferTimestamp, ownershipPublicKeyHash)
        const transferDataToSign = `${transferTimestamp}${ownershipPublicKeyHash}`;
        ownershipSSI.sign(transferDataToSign, (err, signature) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper("Failed to signed transfer data", err));
            }

            let transferSSI = createTransferSSI(domain, ownershipPublicKeyHash, transferTimestamp, signature);
            const {createAnchor, appendToAnchor} = require("../anchoring");
            createAnchor(ownershipSSI, (err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper("Failed to anchor ownershipSSI", err));
                }

                appendToAnchor(ownershipSSI, transferSSI, (err) => {
                    if (err) {
                        return callback(createOpenDSUErrorWrapper("Failed to anchor transferSSI", err));
                    }

                    const result = {
                        tokenSSI: tokenSSI,
                        ownershipSSI: ownershipSSI,
                        transferSSI: transferSSI
                    }

                    callback(undefined, result);
                });
            });
        });
    });
};

const createOwnershipSSI = (domain, levelAndToken, vn, hint, callback) => {
    let ownershipSSI = keySSIFactory.createType(SSITypes.OWNERSHIP_SSI);
    ownershipSSI.initialize(domain, undefined, levelAndToken, vn, hint, callback);
    return ownershipSSI;
};

const createTransferSSI = (domain, hashNewPublicKey, timestamp, signatureCurrentOwner, vn, hint, callback) => {
    let transferSSI = keySSIFactory.createType(SSITypes.TRANSFER_SSI);
    transferSSI.initialize(domain, hashNewPublicKey, timestamp, signatureCurrentOwner, vn, hint, callback);
    return transferSSI;
};

const createTemplateTransferSSI = (domain, hashNewPublicKey, vn, hint) => {
    let transferSSI = keySSIFactory.createType(SSITypes.TRANSFER_SSI);
    transferSSI.load(domain, hashNewPublicKey, undefined, vn, hint);
    return transferSSI;
};

const createSignedHashLinkSSI = (domain, hashLink, timestamp, signature, vn, hint) => {
    let signedHashLink = keySSIFactory.createType(SSITypes.SIGNED_HASH_LINK_SSI);
    signedHashLink.initialize(domain, hashLink, timestamp, signature, vn, hint);
    return signedHashLink;
};

const createPublicKeySSI = (compatibleFamilyName, publicKey, vn) => {
    let publicKeySSI = keySSIFactory.createType(SSITypes.PUBLIC_KEY_SSI);
    publicKeySSI.initialize(compatibleFamilyName, publicKey, vn);
    return publicKeySSI;
};


module.exports = {
    parse,
    createSeedSSI,
    buildSeedSSI,
    buildTemplateSeedSSI,
    buildTemplateWalletSSI,
    createTemplateSeedSSI,
    createTemplateSymmetricalEncryptionSSI,
    createTemplateWalletSSI,
    createTemplateKeySSI,
    createHashLinkSSI,
    createConstSSI,
    createArraySSI,
    buildSymmetricalEncryptionSSI,
    createToken,
    createOwnershipSSI,
    createTransferSSI,
    createTemplateTransferSSI,
    createSignedHashLinkSSI,
    createPublicKeySSI,
    we_createSeedSSI,
    we_createConstSSI,
    we_createArraySSI
};
