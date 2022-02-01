const methodsNames = require("../didMethodsNames");

function KeyDID_Document(enclave, isInitialisation, publicKey) {
    const DID_mixin = require("../W3CDID_Mixin");
    const ObservableMixin = require("../../utils/ObservableMixin");
    DID_mixin(this, enclave);
    ObservableMixin(this);
    let privateKey;
    let domain;
    const openDSU = require("opendsu");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const crypto = openDSU.loadAPI("crypto");
    const dbAPI = openDSU.loadAPI("db");
    const scAPI = openDSU.loadAPI("sc");

    const init = async () => {
        if (isInitialisation) {
            const keyPair = crypto.generateKeyPair();
            privateKey = keyPair.privateKey;
            publicKey = crypto.encodeBase58(keyPair.publicKey);
            setTimeout(() => {
                this.dispatchEvent("initialised");
            })
        } else {
            if (!publicKey) {
                throw Error("Public key is missing from argument list.")
            }
            publicKey = publicKey.slice(4);
            setTimeout(() => {
                this.dispatchEvent("initialised");
            });}
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

    this.getDomain = () => {
        return domain;
    }

    this.getIdentifier = () => {
        return `did:key:zQ3s${publicKey}`;
    };

    this.getPrivateKeys = () => {
        return [privateKey];
    };

    init();
}

module.exports = {
    initiateDIDDocument: function (enclave, seedSSI) {
        return new KeyDID_Document(enclave, true, seedSSI)
    },
    createDIDDocument: function (enclave, tokens) {
        return new KeyDID_Document(enclave, false, tokens[2]);
    }
};
