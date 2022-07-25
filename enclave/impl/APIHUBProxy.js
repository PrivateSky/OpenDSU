const {createCommandObject} = require("./lib/createCommandObject");

function APIHUBProxy(domain, did) {
    const openDSU = require("opendsu");
    const http = openDSU.loadAPI("http");
    const system = openDSU.loadAPI("system");
    const w3cDID = openDSU.loadAPI("w3cdid");
    const scAPI = openDSU.loadAPI("sc");
    const CryptoSkills = w3cDID.CryptographicSkills;
    let initialised = false;
    const ProxyMixin = require("./ProxyMixin");
    ProxyMixin(this);
    let url;
    let didDocument;
    const init = async () => {
        if (typeof did === "undefined") {
            didDocument = CryptoSkills.applySkill("key", CryptoSkills.NAMES.CREATE_DID_DOCUMENT);
            didDocument.on("initialised", () => {
                did = didDocument.getIdentifier();
                url = `${system.getBaseURL()}/runEnclaveCommand/${domain}/${did}`;
                this.finishInitialisation();
                this.dispatchEvent("initialised");
            })
        } else {
            didDocument = await $$.promisify(w3cDID.resolveDID)(did);
            url = `${system.getBaseURL()}/runEnclaveCommand/${domain}/${did}`;
            this.finishInitialisation();
            this.dispatchEvent("initialised");
        }
    }

    this.isInitialised = ()=>{
        return initialised;
    }

    this.getDID = (callback) => {
        callback(undefined, did);
    }

    this.__putCommandObject = (commandName, ...args) => {
        const callback = args.pop();
        const command = createCommandObject(commandName, ...args);
        http.doPut(url, JSON.stringify(command), callback);
    }

    const bindAutoPendingFunctions = require(".././../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    bindAutoPendingFunctions(this, "__putCommandObject", "isInitialised", "on", "off");
    init();
}

module.exports = APIHUBProxy;