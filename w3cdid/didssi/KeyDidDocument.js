function KeyDIDDocument(isInitialisation, seedSSI) {

    let mixin = require("../W3CDID_Mixin");
    mixin(this);
    let tokens;
    if (!isInitialisation) {
        tokens = seedSSI;
        seedSSI = undefined;
    }
    const openDSU = require("../../index");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const crypto = openDSU.loadAPI("crypto");
    const sc = openDSU.loadAPI("sc").getSecurityContext();
    console.log("============================================== Got sc ================================================ ");
    if (typeof seedSSI === "string") {
        try {
            seedSSI = keySSISpace.parse(seedSSI);
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to parse ssi ${seedSSI}`);
        }
    }


    const getDomain = () => {
        let domain;
        if (!isInitialisation) {
            domain = tokens[0];
        } else {
            domain = seedSSI.getDLDomain();
        }

        return domain;
    }

    const getPublicKey = (format) => {
        let publicKey;
        if (!isInitialisation) {
            publicKey = tokens[1];
        } else {
            publicKey = seedSSI.getPublicKey("raw");
        }

        if (format) {
            publicKey = crypto.convertPublicKey(publicKey, format);
        }

        return publicKey;
    }

    this.getIdentifier = () => {
        const domain = getDomain();
        const publicKey = getPublicKey();

        return `did:ssi:key:${domain}:${publicKey}`;
    };

    this.getPrivateKeys = () => {
        const res = {};
        res.privateKey = seedSSI.getPrivateKey();
        return res;
    };


    this.verifyImpl = (data, signature, callback) => {
        const publicKey = getPublicKey("pem");
        const templateKeySSI = keySSISpace.createTemplateSeedSSI(getDomain());
        crypto.verifySignature(templateKeySSI, data, signature, publicKey, callback);
    }

    this.signImpl = (data, callback) => {
        sc.getPrivateInfoForDID(this.getIdentifier(), (err, privateKey) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper(`Failed to get private info for did ${this.getIdentifier()}`, err));
            }

            const keySSI = keySSISpace.createTemplateSeedSSI(getDomain());
            keySSI.initialize(keySSI.getDLDomain(), privateKey);
            crypto.sign(keySSI, data, callback);
        });
    };

    return this;
}

module.exports = {
    initiateDIDDocument: function (seedSSI) {
        return new KeyDIDDocument(true, seedSSI)
    },
    createDIDDocument: function (tokens) {
        return new KeyDIDDocument(false, [tokens[2], tokens[3]]);
    }
};
