const {createCommandObject} = require("./lib/createCommandObject");

function HighSecurityProxy(domain, did) {
    const openDSU = require("opendsu");
    const system = openDSU.loadAPI("system");
    const w3cDID = openDSU.loadAPI("w3cdid");
    const http = openDSU.loadAPI("http");
    const crypto = openDSU.loadAPI("crypto");
    const scAPI = openDSU.loadAPI("sc");
    const CryptoSkills = w3cDID.CryptographicSkills;
    let didDocument;
    const ProxyMixin = require("./ProxyMixin");
    ProxyMixin(this);

    const init = async () => {
        if (typeof domain === "undefined") {
            domain = await $$.promisify(scAPI.getVaultDomain)();
        }
        if (typeof did === "undefined") {
            didDocument = CryptoSkills.applySkill("key", CryptoSkills.NAMES.CREATE_DID_DOCUMENT);
            did = didDocument.getIdentifier();
        } else {
            didDocument = await $$.promisify(w3cDID.resolveDID)(did);
        }
        this.url = `${system.getBaseURL()}/runEnclaveEncryptedCommand/${domain}/${did}`;
        this.finishInitialisation();
    }

    this.getDID = (callback) => {
        callback(undefined, did);
    }

    this.__putCommandObject = (commandName, ...args) => {
        const callback = args.pop();
        const command = createCommandObject(commandName, ...args);
        didDocument.getPublicKey("raw", (err, publicKey) => {
            if (err) {
                return callback(err);
            }

            const encryptionKey = crypto.deriveEncryptionKey(publicKey);
            const encryptedCommand = crypto.encrypt(Buffer.from(JSON.stringify(command)), encryptionKey);
            http.doPut(this.url, encryptedCommand, callback);
        })
    }

    const bindAutoPendingFunctions = require(".././../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    bindAutoPendingFunctions(this, "__putCommandObject");
    init();
}

module.exports = HighSecurityProxy;