const keySSIResolver = require("key-ssi-resolver");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;

const parse = (ssiString) => {
    return keySSIFactory.create(ssiString);
};

const buildSeedSSI = (domain, path, specificString, control, vn, hint) => {
    return buildTemplateKeySSI(SSITypes.SEED_SSI, domain, path, specificString, control, vn, hint);
};

const buildSReadSSI = (domain, path, specificString, control, vn, hint) => {
    return buildTemplateKeySSI(SSITypes.SREAD_SSI, domain, path, specificString, control, vn, hint);
};

const buildSZeroAccessSSI = (domain, path, specificString, control, vn, hint) => {
    return buildTemplateKeySSI(SSITypes.SZERO_ACCESS_SSI, domain, path, specificString, control, vn, hint);
};

const buildHashLinkSSI = (domain, path, specificString, control, vn, hint) => {
    return buildTemplateKeySSI(SSITypes.HASH_LINK_SSI, domain, path, specificString, control, vn, hint);
};

const buildTemplateKeySSI = (ssiType, domain, path, specificString, control, vn, hint) => {
    const keySSI = keySSIFactory.create(ssiType);
    let dlDomain = domain;
    if(typeof path !== "undefined" && path !== ''){
        dlDomain = dlDomain + "/" + path;
    }
    keySSI.load(ssiType, dlDomain, specificString, control, vn, hint);
    return keySSI;
};

module.exports = {
    parse,
    buildSeedSSI,
    buildSReadSSI,
    buildSZeroAccessSSI,
    buildHashLinkSSI,
    buildTemplateKeySSI
};