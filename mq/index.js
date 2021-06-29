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

function MQHandler(didDocument, domain) {
    let token;
    let expiryTime;
    let queueName = didDocument.getHash();
    domain = domain || didDocument.getDomain();

    function getURL(queueName, action, signature, messageID, callback) {
        let url
        if (typeof signature === "function") {
            callback = signature;
            signature = undefined;
            messageID = undefined;
        }

        if (typeof messageID === "function") {
            callback = messageID;
            messageID = undefined;
        }

        bdns.getMQEndpoints(domain, (err, mqEndpoints) => {
            if (err) {
                return callback(err);
            }

            url = `${mqEndpoints[0]}/mq/${domain}`
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

            callback(undefined, url);
        })
    }

    function ensureAuth(callback) {
        getURL(queueName, "token", (err, url) => {
            if (err) {
                return callback(err);
            }

            if (!token || (expiryTime && Date.now() + 2000 > expiryTime)) {
                callback = $$.makeSaneCallback(callback);
                return http.fetch(url)
                    .then(response => response.json())
                    .then(data => {
                        token = data.token;
                        expiryTime = data.expires;
                        callback(undefined, token);
                    })
                    .catch(err => callback(err));
            }

            callback(undefined, token);
        });
    }

    this.writeMessage = (message, callback) => {
        ensureAuth((err, token) => {
            if (err) {
                return callback(err);
            }

            getURL(queueName, "put", (err, url) => {
                if (err) {
                    return callback(err);
                }

                http.doPut(url, message, {headers: {"Authorization": token}}, callback);
            });
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

                getURL(queueName, action, signature.toString("hex"), (err, url) => {
                    if (err) {
                        return callback(err);
                    }
                    callback = $$.makeSaneCallback(callback);
                    http.fetch(url, {headers: {Authorization: token}})
                        .then(response => response.json())
                        .then(data => callback(undefined, data))
                        .catch(err => callback(err));
                })
            })
        })
    }

    this.previewMessage = (callback) => {
        consumeMessage("get", callback);
    }

    this.readMessage = (callback) => {
        consumeMessage("take", callback);
    };

    this.deleteMessage = (messageID, callback) => {
        throw Error("Not implemented");
    }
}

function getMQHandlerForDID(didDocument, domain) {
    return new MQHandler(didDocument, domain);
}

module.exports = {
    send,
    getHandler,
    unsubscribe,
    getMQHandlerForDID
}