/*
Message Queues API space
*/

let http = require("../http");
let bdns = require("../bdns")

function send(keySSI, message, callback) {
    bdns.getAnchoringServices(keySSI, (err, endpoints) => {
        if (err) {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get anchoring services from bdns`, err));
        }
        let url = endpoints[0] + `/mq/send-message/${keySSI}`;
        let options = {body: message};

        let request = http.poll(url, options, timeout);

        request.then((response) => {
            callback(undefined, response);
        }).catch((err) => {
            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to send message`, err));
        });
    });
}

let requests = {};

function getHandler(keySSI, timeout) {
    let obs = require("../utils/observable").createObservable();
    bdns.getMQEndpoints(keySSI, (err, endpoints) => {
        if (err || endpoints.length === 0) {
            return callback(new Error("Not available!"));
        }

        let createChannelUrl = endpoints[0] + `/mq/create-channel/${keySSI}`;
        http.doPost(createChannelUrl, undefined, (err, response) => {
            if (err) {
                if (err.statusCode === 409) {
                    //channels already exists. no problem :D
                } else {
                    get
                    obs.dispatch("error", err);
                    return;
                }
            }

            function makeRequest() {
                let url = endpoints[0] + `/mq/receive-message/${keySSI}`;
                let options = {};

                let request = http.poll(url, options, timeout);

                request.then((response) => {
                    obs.dispatch("message", response);
                    makeRequest();
                }).catch((err) => {
                    obs.dispatch("error", err);
                });

                requests[obs] = request;
            }

            makeRequest();

        });
    });

    return obs;
}

function unsubscribe(keySSI, observable) {
    http.unpoll(requests[observable]);
}

function MQHandler(domain, didDocument) {
    let token;
    let expiryTime;
    let queueName = didDocument.getHash();

    function getURL(queueName, action, signature, messageID) {
        let url = `/mq/${domain}`;
        switch (action) {
            case "token":
                url = `${url}/${queueName}/token`;
                break;
            case "get":
                url = `${url}/get/${queueName}/${signature}`;
                break;
            case "put":
                url = `${url}/put/${queueName}`;
                break;
            case "take":
                url = `${url}/take/${queueName}/${signature}`;
                break;
            case "delete":
                url = `${url}/delete/${queueName}/${messageID}/${signature}`;
                break;
            default:
                throw Error(`Invalid action received ${action}`);
        }

        return url;
    }

    function ensureAuth(callback) {
        const url = getURL(queueName, "token");
        if (!token || (expiryTime && Date.now() + 2000 > expiryTime)) {
            return http.doGet(url, (err, response) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Cannot initiate authorisation process`, err));
                }

                try {
                    response = JSON.parse(response);
                } catch (e) {
                    return callback(createOpenDSUErrorWrapper(`Failed to parse authorisation result`, e));
                }

                token = response.token;
                expiryTime = response.expires;
                callback(undefined, token);
            })
        }

        callback(undefined, token);
    }

    this.writeMessage = (message, callback) => {
        ensureAuth((err, token) => {
            if (err) {
                return callback(err);
            }

            const url = getURL(queueName, "put");
            http.doPut(url, message, {headers: {Authorization: token}}, callback);
        })

    }

    function consumeMessage(action, callback) {
        ensureAuth((err, token) => {
            if (err) {
                return callback(err);
            }

            didDocument.sign(token, (err, signature) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to sign token`, err));
                }

                const url = getURL(queueName, action, signature);
                callback = $$.makeSaneCallback(callback);
                http.fetch(url, {headers: {Authorization: token}})
                    .then(response => response.json())
                    .then(data => callback(undefined, data))
                    .catch(err => callback(err));
            })
        })
    }

    this.readMessage = (callback) => {
        consumeMessage("get", callback);
    }

    this.takeMessage = (callback) => {
        consumeMessage("take", callback);
    };

    this.deleteMessage = (messageID, callback) => {
        throw Error("Not implemented");
    }
}

function getMQHandlerForDID(domain, didDocument) {
    return new MQHandler(domain, didDocument);
}

module.exports = {
    send,
    getHandler,
    unsubscribe,
    getMQHandlerForDID
}