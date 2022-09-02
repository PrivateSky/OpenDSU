require("../../../../psknode/bundles/testsRuntime");

const assert = require("double-check").assert;

assert.callback("Sign and verify signature test", (callback) => {
    // const seedSSI = keyssispace.createTemplateSeedSSI("default");
    //
    // seedSSI.initialize("default", undefined, undefined, undefined, "hint", (err) => {
    //     if (err) {
    //         throw err;
    //     }
    //
    //     const hashFn = crypto.getCryptoFunctionForKeySSI(seedSSI, "hash");
    //     const hash = hashFn({data: "some data"});
    //
    //     crypto.sign(seedSSI, hash, (err, signature) => {
    //         if (err) {
    //             throw err;
    //         }
    //
    //         crypto.verifySignature(seedSSI, hash, signature, (err, status) => {
    //             if (err) {
    //                 throw err;
    //             }
    //             assert.true(status);
    //             callback();
    //         })
    //     });
    // });

    const pskCrypto = require("pskcrypto");
    const privateKey = "some string";
    const ecdh = require("crypto").createECDH("secp256k1");
    ecdh.setPrivateKey(privateKey, "utf-8");
    const ecKeyGenerator = pskCrypto.createKeyPairGenerator();
    const pemPrivateKey = ecKeyGenerator.convertPrivateKey(ecdh.getPrivateKey());
    const sign = require("crypto").createSign("sha256");
    sign.update("data to sign");
    const signature = sign.sign(pemPrivateKey);
    console.log(signature);
});