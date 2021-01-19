const keySSIResolver = require("key-ssi-resolver");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;

const parse = (ssiString, options) => {
    return keySSIFactory.create(ssiString, options);
};

const buildSeedSSI = (domain, specificString, control, vn, hint, callback) => {
    return buildTemplateKeySSI(SSITypes.SEED_SSI, domain, specificString, control, vn, hint, callback);
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

const buildSReadSSI = (domain,  specificString, control, vn, hint, callback) => {
    return buildTemplateKeySSI(SSITypes.SREAD_SSI, domain, specificString, control, vn, hint, callback);
};

const buildSZeroAccessSSI = (domain,  specificString, control, vn, hint, callback) => {
    return buildTemplateKeySSI(SSITypes.SZERO_ACCESS_SSI, domain, specificString, control, vn, hint, callback);
};

const buildHashLinkSSI = (domain, specificString, control, vn, hint, callback) => {
    return buildTemplateKeySSI(SSITypes.HASH_LINK_SSI, domain,  specificString, control, vn, hint, callback);
};

const buildTemplateKeySSI = (ssiType, domain, specificString, control, vn, hint, callback) => {
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

const buildTemplateKeySSIWithConfigMap = (keySSIConfig, callback) => {
    const {ssiType, domain, specificString, control, vn, hint} = keySSIConfig
    if (!ssiType || !domain) {
        throw new Error('"ssiType" and "domain" are required for KeySSITemplate creation')
    }

    const keySSI = keySSIFactory.createType(ssiType);
    keySSI.load(ssiType, domain, specificString, control, vn, hint);
    if (typeof callback === "function") {
        callback(undefined, keySSI);
    }

    return keySSI;
};


const buildWalletSSI = (domain, arrayWIthCredentials, hint) => {
    try{
        let ssi  = buildArraySSI(domain, arrayWIthCredentials,undefined,hint);
        ssi.cast(SSITypes.WALLET_SSI);
        return parse(ssi.getIdentifier());
    } catch(err){
        console.log("Failing to build WalletSSI");
    }
};

const buildArraySSI = (domain, arr, vn, hint, callback) => {
    const arraySSI = keySSIFactory.createType(SSITypes.ARRAY_SSI);
    arraySSI.initialize(domain, arr, vn, hint);
    return arraySSI;
};

const buildSymmetricalEncryptionSSI = (domain, encryptionKey, control, vn, hint, callback) => {
    return buildTemplateKeySSI(SSITypes.SYMMETRICAL_ENCRYPTION_SSI, domain, encryptionKey, control, vn, hint, callback);
};

module.exports = {
    parse,
    buildSeedSSI,
    createSeedSSI,
    buildWalletSSI,
    buildSReadSSI,
    buildSZeroAccessSSI,
    buildHashLinkSSI,
    buildTemplateKeySSI,
    buildTemplateKeySSIWithConfigMap,
    buildArraySSI,
    buildSymmetricalEncryptionSSI
};