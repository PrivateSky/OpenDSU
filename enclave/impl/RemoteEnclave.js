const { createCommandObject } = require("./lib/createCommandObject");

function RemoteEnclave(clientDID, remoteDID) {
    let initialised = false;
    const ProxyMixin = require("./ProxyMixin");
    const openDSU = require('../../index');
    const w3cDID = openDSU.loadAPI("w3cdid");

    ProxyMixin(this);

    const init = async () => {
        try {
            this.clientDIDDocument = await $$.promisify(w3cDID.resolveDID)(clientDID);
            this.remoteDIDDocument = await $$.promisify(w3cDID.resolveDID)(remoteDID);
        }
        catch (err) {
            console.log(err);
        }
        this.initialised = true;
        this.dispatchEvent("initialised");

    }

    this.isInitialised = () => {
        return initialised;
    }

    this.getDID = (callback) => {
        callback(undefined, did);
    }

    this.__putCommandObject = (commandName, ...args) => {
        const callback = args.pop();
        const command = JSON.stringify(createCommandObject(commandName, ...args));
        this.clientDIDDocument.sendMessage(command, this.remoteDIDDocument, callback);
    }

    init();

}

module.exports = RemoteEnclave;