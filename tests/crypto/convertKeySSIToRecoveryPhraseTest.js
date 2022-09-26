require("../../../../psknode/bundles/testsRuntime");

const assert = require("double-check").assert;
const crypto = require("../../index").loadApi("crypto");
const keySSIResolver = require("key-ssi-resolver");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;

assert.callback("Convert keySSI to Recovery Phrase", (callback) => {
    const domain = "default";
    const seedSSI = keySSIFactory.createType(SSITypes.SEED_SSI);
    seedSSI.initialize(domain, undefined, undefined, "v0");
    
    const mnemonic = crypto.convertKeySSIObjectToMnemonic(seedSSI);
    const identifier = seedSSI.getIdentifier(true);
    const recoveredKey = crypto.convertMnemonicToKeySSIIdentifier(mnemonic, SSITypes.SEED_SSI, domain, "v0");

    assert.equal(identifier, recoveredKey);
    callback();
}, 100);