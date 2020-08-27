require("../../../../psknode/bundles/testsRuntime");

const assert = require("double-check").assert;
const crypto = require("../../index").loadApi("crypto");
const keySSIResolver = require("key-ssi-resolver");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;

const seedSSI = keySSIFactory.create(SSITypes.SEED_SSI);
assert.callback("Encryption and decryption test", (callback) => {
    seedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
        if (err) {
            throw err;
        }

        const data = "some data";
        crypto.encrypt(seedSSI, data, (err, encryptedData) => {
            if (err) {
                throw err;
            }

            crypto.decrypt(seedSSI, encryptedData, (err, plainData) => {
                if (err) {
                    throw err;
                }


                assert.true(data === plainData.toString());
                callback();
            });
        });
    });
});