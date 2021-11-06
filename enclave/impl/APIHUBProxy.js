const {bindAutoPendingFunctions} = require(".././../utils/BindAutoPendingFunctions");
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
    const init = async () => {
        if (typeof domain === "undefined") {
            domain = await $$.promisify(scAPI.getVaultDomain)();
        }

        if (typeof did === "undefined") {
            did = CryptoSkills.applySkill("key", CryptoSkills.NAMES.CREATE_DID_DOCUMENT).getIdentifier();
        }

        url = `${system.getBaseURL()}/runEnclaveCommand/${domain}/${did}`;
        initialised = true;
        this.finishInitialisation();
        this.dispatchEvent("initialised");
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
    bindAutoPendingFunctions(this, "__putCommandObject", "isInitialised");
    init();
}

module.exports = APIHUBProxy;