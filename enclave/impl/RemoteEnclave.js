const { createCommandObject } = require("./lib/createCommandObject");
const ProxyMixin = require("./ProxyMixin");
const openDSU = require('../../index');
const w3cDID = openDSU.loadAPI("w3cdid");

function RemoteEnclave(clientDID, remoteDID, requestTimeout) {
    let initialised = false;
    const DEFAULT_TIMEOUT = 5000;

    this.commandsMap = new Map();
    this.requestTimeout = requestTimeout ?? DEFAULT_TIMEOUT;

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
        args.push(clientDID);

        const command = JSON.stringify(createCommandObject(commandName, ...args));
        const commandID = JSON.parse(command).commandID;
        this.commandsMap.set(commandID, { "callback": callback, "time": Date.now() });

        if (this.commandsMap.size == 1) {
            this.subscribe();

        }

        this.clientDIDDocument.sendMessage(command, this.remoteDIDDocument, (err, res) => {
            if (err) {
                console.log(err);
            }
            setTimeout(this.checkTimeout, this.requestTimeout, commandID);
        });
    }

    this.subscribe = () => {
        this.clientDIDDocument.waitForMessages((err, res) => {
            if (err) {
                console.log(err);
                return;
            }

            try {
                const resObj = JSON.parse(res);
                const commandResult = resObj.commandResult;
                const commandID = resObj.commandID;

                const callback = this.commandsMap.get(commandID).callback;
                callback(err, JSON.stringify(commandResult));

                this.commandsMap.delete(commandID);
                if (this.commandsMap.size == 0) {
                    this.clientDIDDocument.stopWaitingForMessages();
                }
            }
            catch (err) {
                console.log(err);
            }
        })
    }

    this.checkTimeout = (commandID) => {
        if (!this.commandsMap.has(commandID)) return;

        const callback = this.commandsMap.get(commandID).callback;
        callback(createOpenDSUErrorWrapper(`Timeout for command ${commandID}`), undefined);
        this.commandsMap.delete(commandID);
        if (this.commandsMap.size == 0) {
            this.clientDIDDocument.stopWaitingForMessages();
        }
    }

    init();

}

module.exports = RemoteEnclave;