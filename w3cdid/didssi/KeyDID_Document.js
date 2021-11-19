const methodsNames = require("../didMethodsNames");
const {bindAutoPendingFunctions} = require("../../utils/BindAutoPendingFunctions");

function KeyDID_Document(enclave, isInitialisation, seedSSI) {
    let DID_mixin = require("../W3CDID_Mixin");
    DID_mixin(this, enclave);

    const openDSU = require("opendsu");
    const dbAPI = openDSU.loadAPI("db");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const crypto = openDSU.loadAPI("crypto");

    let tokens;
    const __init = async () => {
        if (!isInitialisation) {
            tokens = seedSSI;
            seedSSI = undefined;
        }

        if (typeof seedSSI === "string") {
            try {
                seedSSI = keySSISpace.parse(seedSSI);
            } catch (e) {
                throw createOpenDSUErrorWrapper(`Failed to parse ssi ${seedSSI}`);
            }
        }
    }

    this.getMethodName = () => {
        return methodsNames.SSI_KEY_SUBTYPE;
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

    __init();
    return this;
}

module.exports = {
    initiateDIDDocument: function (enclave, seedSSI) {
        return new KeyDID_Document(enclave, true, seedSSI);
    },
    createDIDDocument: function (enclave, tokens) {
        return new KeyDID_Document(enclave, false,  [tokens[3], tokens[4]]);
    }
};
