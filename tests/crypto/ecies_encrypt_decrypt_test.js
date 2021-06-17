require("../../../../psknode/bundles/testsRuntime");

const assert = require("double-check").assert;
const crypto = require("../../crypto");
const keySSISpace = require("../../keyssi");
assert.callback("ECIES Encryption and Decryption test", (callback) => {
    keySSISpace.createSeedSSI("default", (err, seedSSI) => {
        if (err) {
            throw err;
        }

        const data = "some data";
        keySSISpace.createSeedSSI("default", (err, newSeedSSI) => {
            const publicKeySSI = keySSISpace.createPublicKeySSI("default", newSeedSSI.getPublicKey("raw"));
            const encryptedData = crypto.ecies_encrypt_ds(seedSSI, publicKeySSI, Buffer.from(data));
            const plainData = crypto.ecies_decrypt_ds(newSeedSSI, encryptedData);
            assert.true(data === plainData.message.toString());
            callback();
        });
    });
}, 5000);
