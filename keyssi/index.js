const keySSIResolver = require("key-ssi-resolver");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;

const parse = (ssiString, options) => {
    return keySSIFactory.create(ssiString, options);
};

const buildSeedSSI = (domain, specificString, control, vn, hint) => {
    return buildTemplateKeySSI(SSITypes.SEED_SSI, domain, specificString, control, vn, hint);
};

const buildWalletSSI = (domain, specificString, control, vn, hint) => {
    return buildTemplateKeySSI(SSITypes.WALLET_SSI, domain, specificString, control, vn, hint);
};

const buildSReadSSI = (domain,  specificString, control, vn, hint) => {
    return buildTemplateKeySSI(SSITypes.SREAD_SSI, domain, specificString, control, vn, hint);
};

const buildSZeroAccessSSI = (domain,  specificString, control, vn, hint) => {
    return buildTemplateKeySSI(SSITypes.SZERO_ACCESS_SSI, domain, specificString, control, vn, hint);
};

const buildHashLinkSSI = (domain, specificString, control, vn, hint) => {
    return buildTemplateKeySSI(SSITypes.HASH_LINK_SSI, domain,  specificString, control, vn, hint);
};

const buildTemplateKeySSI = (ssiType, domain, specificString, control, vn, hint) => {
    const keySSI = keySSIFactory.createType(ssiType);
    keySSI.load(ssiType, domain, specificString, control, vn, hint);
    return keySSI;
};

const buildArraySSI = (domain, arr, vn, hint) => {
    const arraySSI = keySSIFactory.createType(SSITypes.ARRAY_SSI);
    arraySSI.initialize(domain, arr, vn, hint);
};

module.exports = {
    parse,
    buildSeedSSI,
    buildWalletSSI,
    buildSReadSSI,
    buildSZeroAccessSSI,
    buildHashLinkSSI,
    buildTemplateKeySSI,
    buildArraySSI
};