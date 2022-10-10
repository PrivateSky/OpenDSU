require("../../../../psknode/bundles/testsRuntime");

const assert = require("double-check").assert;
const crypto = require("../../crypto");
const keySSISpace = require("../../keyssi");
const seedSSI = keySSISpace.buildTemplateSeedSSI("default");
assert.callback("Encryption and decryption test", (callback) => {
    seedSSI.initialize("default", undefined, undefined, undefined, "hint", async (err) => {
        if (err) {
            throw err;
        }

        const data = "some data";
        const encryptionKey = await $$.promisify(seedSSI.getEncryptionKey)();
        const encrypt = crypto.getCryptoFunctionForKeySSI(seedSSI, "encryption");
        const decrypt = crypto.getCryptoFunctionForKeySSI(seedSSI, "decryption");
        const encryptedData = encrypt(data, encryptionKey)
        const plainData = decrypt(encryptedData, encryptionKey);
        assert.true(data === plainData.toString());
        callback();
    });
});