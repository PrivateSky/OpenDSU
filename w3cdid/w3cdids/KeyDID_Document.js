const methodsNames = require("../didMethodsNames");

function KeyDID_Document(isInitialisation, publicKey) {
    let mixin = require("../W3CDID_Mixin");
    mixin(this);
    let privateKey;
    const openDSU = require("opendsu");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const crypto = openDSU.loadAPI("crypto");

    const init = async () => {
        if (isInitialisation) {
            let seedSSI = keySSISpace.createSeedSSI();
            privateKey = seedSSI.getPrivateKey();
            publicKey = crypto.encodeBase58(seedSSI.getPublicKey("raw"));
        }
    };

    const getRawPublicKey = () => {
        return crypto.decodeBase58(publicKey);
    }

    this.getPublicKey = (format, callback) => {
        let pubKey = getRawPublicKey();
        if (format === "raw") {
            return callback(undefined, pubKey);
        }
        try {
            pubKey = crypto.convertPublicKey(pubKey, format);
        } catch (e) {
            return callback(createOpenDSUErrorWrapper(`Failed to convert public key to ${format}`, e));
        }

        callback(undefined, pubKey);
    };

    this.getMethodName = () => {
        return methodsNames.KEY_SUBTYPE;
    }

    this.getIdentifier = () => {
        return `did:key:${publicKey}`;
    };

    this.getPrivateKeys = () => {
        return [privateKey];
    };

    init();
}

module.exports = {
    initiateDIDDocument: function (seedSSI) {
        return new KeyDID_Document(true, seedSSI)
    },
    createDIDDocument: function (tokens) {
        return new KeyDID_Document(false, tokens[2]);
    }
};
