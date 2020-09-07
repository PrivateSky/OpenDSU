const keySSIResolver = require("key-ssi-resolver");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;

const parse = (ssiString) => {
    return keySSIFactory.create(ssiString);
};

const buildSeedSSI = (domain, path, specificString, control, vn, hint) => {
    const seedSSI = keySSIFactory.create(SSITypes.SEED_SSI);
    let dlDomain = domain;
    if(typeof path !== "undefined" && path !== ''){
        dlDomain = dlDomain + "/" + path;
    }
    seedSSI.load(SSITypes.SEED_SSI, dlDomain, specificString, control, vn, hint);
    return seedSSI;
};

const buildSReadSSI = (domain, path, specificString, control, vn, hint) => {
    const sReadSSI = keySSIFactory.create(SSITypes.SREAD_SSI);
    let dlDomain = domain;
    if(typeof path !== "undefined" && path !== ''){
        dlDomain = dlDomain + "/" + path;
    }
    sReadSSI.load(SSITypes.SREAD_SSI, dlDomain, specificString, control, vn, hint);
    return sReadSSI;
};

const buildSZeroAccessSSI = (domain, path, specificString, control, vn, hint) => {
    const sZaSSI = keySSIFactory.create(SSITypes.SZERO_ACCESS_SSI);
    let dlDomain = domain;
    if(typeof path !== "undefined" && path !== ''){
        dlDomain = dlDomain + "/" + path;
    }
    sZaSSI.load(SSITypes.SZERO_ACCESS_SSI, dlDomain, specificString, control, vn, hint);
    return sZaSSI;
};

const buildHashLinkSSI = (domain, path, specificString, control, vn, hint) => {
    const hlSSI = keySSIFactory.create(SSITypes.HASH_LINK_SSI);
    let dlDomain = domain;
    if(typeof path !== "undefined" && path !== ''){
        dlDomain = dlDomain + "/" + path;
    }
    hlSSI.load(SSITypes.HASH_LINK_SSI, dlDomain, specificString, control, vn, hint);
    return hlSSI;
};

module.exports = {
    parse,
    buildSeedSSI,
    buildSReadSSI,
    buildSZeroAccessSSI,
    buildHashLinkSSI
};