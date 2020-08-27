const keySSIResolver = require("key-ssi-resolver");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;

const parse = (ssiString) => {
    return keySSIFactory.create(ssiString);
};

const buildSeedSSI = (domain, path, specificString, control, vn, hint) => {
    const seedSSI = keySSIFactory.create(SSITypes.SEED_SSI);
    seedSSI.load(`${domain}/${path}`, specificString, control, vn, hint);
    return seedSSI;
};

const buildSReadSSI = (domain, path, specificString, control, vn, hint) => {
    const sReadSSI = keySSIFactory.create(SSITypes.SREAD_SSI);
    sReadSSI.load(`${domain}/${path}`, specificString, control, vn, hint);
    return sReadSSI;
};

const buildSZeroAccessSSI = (domain, path, specificString, control, vn, hint) => {
    const sZaSSI = keySSIFactory.create(SSITypes.SZERO_ACCESS_SSI);
    sZaSSI.load(`${domain}/${path}`, specificString, control, vn, hint);
    return sZaSSI;
};

module.exports = {
    parse,
    buildSeedSSI,
    buildSReadSSI,
    buildSZeroAccessSSI
};