const keySSIResolver = require("key-ssi-resolver");
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
    buildSymmetricalEncryptionSSI
};