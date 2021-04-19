const keySSIResolver = require("key-ssi-resolver");
const crypto = require("../crypto");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;

const parse = (ssiString, options) => {
    return keySSIFactory.create(ssiString, options);
};

const createSeedSSI = (domain, vn, hint, callback) => {
    if(typeof vn == "function"){
        callback = vn;
        vn = undefined;
    }

    if(typeof hint == "function"){
        callback = hint;
        hint = undefined;
    }

    let seedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);

    seedSSI.initialize(domain, undefined, undefined, vn, hint, callback );
    return seedSSI;
};

const buildSeedSSI = function(){
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
    try{
        let ssi  = createArraySSI(domain, arrayWIthCredentials,undefined,hint);
        ssi.cast(SSITypes.WALLET_SSI);
        return parse(ssi.getIdentifier());
    } catch(err){
        console.log("Failing to build WalletSSI");
    }
};

const createTemplateWalletSSI = (domain, arrayWIthCredentials, hint) => {
    try{
        let ssi  = createArraySSI(domain, arrayWIthCredentials,undefined,hint);
        ssi.cast(SSITypes.WALLET_SSI);
        return parse(ssi.getIdentifier());
    } catch(err){
        console.log("Failing to build WalletSSI");
    }
};
const createArraySSI = (domain, arr, vn, hint, callback) => {
    const arraySSI = keySSIFactory.createType(SSITypes.ARRAY_SSI);
    arraySSI.initialize(domain, arr, vn, hint);
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
    // the tokenSSI is closely linked with an ownershipSSI
    // the tokenSSI must have the ownershipSSI's public key hash
    // the ownershipSSI must have the tokenSSI's base58 ssi
    const ownershipSSI = keySSIFactory.createType(SSITypes.OWNERSHIP_SSI);
    ownershipSSI.initialize(domain, undefined, undefined, vn, hint);

    const ownershipPublicKeyHash = ownershipSSI.getPublicKeyHash();
    const ownershipPrivateKey = ownershipSSI.getPrivateKeyHash();
    
    const tokenSSI = keySSIFactory.createType(SSITypes.TOKEN_SSI);
    tokenSSI.initialize(domain, amountOrSerialNumber, ownershipPublicKeyHash, vn, hint);

    // update ownershipSSI to set level and token
    const ownershipLevelAndToken = `0/${tokenSSI.getIdentifier()}`;
    ownershipSSI.load(SSITypes.OWNERSHIP_SSI, domain, ownershipPrivateKey, ownershipLevelAndToken, vn, hint);

    // create a TRANSFER_SSI, since the token's ownership is first transfered to the owner itself
    const transferSSI = keySSIFactory.createType(SSITypes.TRANSFER_SSI);
    const transferTimestamp = new Date().getTime();

    // get signature by sign(lastEntryInAnchor, transferTimestamp, ownershipPublicKeyHash)
    const transferDataToSign = `${transferTimestamp}/${ownershipPublicKeyHash}`;
    crypto.sign(ownershipSSI, transferDataToSign, (_err, signedTransferData) => {
        const signatureCurrentOwner = crypto.encodeBase58(signedTransferData);
        const timestampAndSignature = `${transferTimestamp}/${signatureCurrentOwner}`;
        transferSSI.initialize(domain, ownershipPublicKeyHash, timestampAndSignature, vn, hint);
    });
    
    // anchor the transferSSI and return anchor to callback call
    // addVersion(ownershipSSI, transferSSI, (err) => {

    // });
    
    result = {
        tokenSSI,
        ownershipSSI,
        transferSSI
    }

    return result;
};

const createOwnershipSSI = (domain, levelAndToken, vn, hint, callback) => {
    let ownershipSSI = keySSIFactory.createType(SSITypes.OWNERSHIP_SSI);
    ownershipSSI.initialize(domain, undefined, levelAndToken, vn, hint, callback);
    return ownershipSSI;
};

const createTransferSSI = (domain, hashNewPublicKey, signatureCurrentOwner, vn, hint, callback) => {
    let transferSSI = keySSIFactory.createType(SSITypes.TRANSFER_SSI);
    transferSSI.initialize(domain, hashNewPublicKey, signatureCurrentOwner, vn, hint, callback);
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
    createArraySSI,
    buildSymmetricalEncryptionSSI,
    createToken,
    createOwnershipSSI,
    createTransferSSI,
    createTemplateTransferSSI,
    createSignedHashLinkSSI
};