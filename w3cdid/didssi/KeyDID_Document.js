function KeyDID_Document(isInitialisation, seedSSI) {
    let mixin = require("../W3CDID_Mixin");
    mixin(this);
    let tokens;
    if (!isInitialisation) {
        tokens = seedSSI;
        seedSSI = undefined;
    }
    const openDSU = require("opendsu");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const crypto = openDSU.loadAPI("crypto");
    const sc = openDSU.loadAPI("sc").getSecurityContext();
    if (typeof seedSSI === "string") {
        try {
            seedSSI = keySSISpace.parse(seedSSI);
        } catch (e) {
            throw createOpenDSUErrorWrapper(`Failed to parse ssi ${seedSSI}`);
        }
    }

    this.getDomain = () => {
        let domain;
        if (!isInitialisation) {
            domain = tokens[0];
        } else {
            domain = seedSSI.getDLDomain();
        }

        return domain;
    }

    const getRawPublicKey = () => {
        let publicKey;
        if (!isInitialisation) {
            publicKey = crypto.decodeBase58(tokens[1])
        } else {
            publicKey = seedSSI.getPublicKey("raw");
        }

        return publicKey;
    }

    this.getPublicKey = (format, callback) => {
        let pubKey = getRawPublicKey();
        try {
            pubKey = crypto.convertPublicKey(pubKey, format);
        } catch (e) {
            return callback(createOpenDSUErrorWrapper(`Failed to convert public key to ${format}`, e));
        }

        callback(undefined, pubKey);
    };

    this.getIdentifier = () => {
        const domain = this.getDomain();
        let publicKey = getRawPublicKey();
        publicKey = crypto.encodeBase58(publicKey);
        return `did:ssi:key:${domain}:${publicKey}`;
    };

    this.getPrivateKeys = () => {
        return [seedSSI.getPrivateKey()];
    };

    return this;
}

module.exports = {
    initiateDIDDocument: function (seedSSI) {
        return new KeyDID_Document(true, seedSSI)
    },
    createDIDDocument: function (tokens) {
        return new KeyDID_Document(false, [tokens[3], tokens[4]]);
    }
};
