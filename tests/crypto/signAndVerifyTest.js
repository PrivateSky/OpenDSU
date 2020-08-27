require("../../../../psknode/bundles/testsRuntime");

const assert = require("double-check").assert;
const crypto = require("../../index").loadApi("crypto");
const keySSIResolver = require("key-ssi-resolver");
const keySSIFactory = keySSIResolver.KeySSIFactory;
const SSITypes = keySSIResolver.SSITypes;

const seedSSI = keySSIFactory.create(SSITypes.SEED_SSI);
assert.callback("Sign and verify signature test", (callback) => {
    seedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
        if (err) {
            throw err;
        }

        crypto.hash(seedSSI, {data: "some data"}, (err, hash) => {
            if (err) {
                throw err;
            }

            crypto.sign(seedSSI, hash, (err, signature) => {
                if (err) {
                    throw err;
                }

                crypto.verifySignature(seedSSI, hash, signature, (err, status)=>{
                    if (err) {
                        throw err;
                    }
                    assert.true(status);
                    callback();
                })
            });
        });
    });
});
