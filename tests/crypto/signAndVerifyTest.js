require("../../../../psknode/bundles/testsRuntime");

const assert = require("double-check").assert;
const keyssispace = require("../../index").loadApi("keyssi");
const crypto = require("../../index").loadApi("crypto");

assert.callback("Sign and verify signature test", (callback) => {
    const seedSSI = keyssispace.createTemplateSeedSSI("default");

    seedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
        if (err) {
            throw err;
        }

        const hashFn = crypto.getCryptoFunctionForKeySSI(seedSSI, "hash");
        const hash = hashFn({data: "some data"});

        crypto.sign(seedSSI, hash, (err, signature) => {
            if (err) {
                throw err;
            }

            crypto.verifySignature(seedSSI, hash, signature, (err, status) => {
                if (err) {
                    throw err;
                }
                assert.true(status);
                callback();
            })
        });
    });
});

assert.callback("Sign and verify signature test with sRead", (callback) => {
    const seedSSI = keyssispace.createTemplateSeedSSI("default");

    seedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
        if (err) {
            throw err;
        }

        const hashFn = crypto.getCryptoFunctionForKeySSI(seedSSI, "hash");
        const hash = hashFn({data: "some data"});

        crypto.sign(seedSSI, hash, (err, signature) => {
            if (err) {
                throw err;
            }

            const sReadSSI = seedSSI.derive();
            crypto.verifySignature(sReadSSI, hash, signature, seedSSI.getPublicKey(), (err, status) => {
                if (err) {
                    throw err;
                }
                assert.true(status);
                callback();
            })
        });
    });
});
