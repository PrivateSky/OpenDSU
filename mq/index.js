/*
Message Queues API space
*/

let http = require("../http");
let bdns = require("../bdns")

function send(keySSI, message, callback) {
    console.log("Send method from OpenDSU.loadApi('mq') is absolute. Adapt you code to use the new getMQHandlerForDID");
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
    console.log("getHandler method from OpenDSU.loadApi('mq') is absolute. Adapt you code to use the new getMQHandlerForDID");
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
    console.log("unsubscribe method from OpenDSU.loadApi('mq') is absolute. Adapt you code to use the new getMQHandlerForDID");
    http.unpoll(requests[observable]);
}

function MQHandler(didDocument, domain, pollingTimeout) {
    let connectionTimeout;
    let timeout = pollingTimeout || 1000;
    let token;
    let expiryTime;
    let queueName = didDocument.getHash();

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

        if (!domain) {
            const sc = require("opendsu").loadAPI("sc");
            sc.getDIDDomain((err, didDomain) => {
                if (err) {
                    return callback(err);
                }

                domain = didDomain;
                __createURL();
            })
        } else {
            __createURL();
        }

        function __createURL() {
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
    }

    function ensureAuth(callback) {
        getURL(queueName, "token", (err, url) => {
            if (err) {
                return callback(err);
            }

            if (!token || (expiryTime && Date.now() + 2000 > expiryTime)) {
                callback = $$.makeSaneCallback(callback);
                return http.fetch(url)
                    .then(response => {
                        connectionTimeout = parseInt(response.headers["connection-timeout"]);
                        return response.json()
                    })
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

    function consumeMessage(action, waitForMore, callback) {
        if (typeof waitForMore === "function") {
            callback = waitForMore;
            waitForMore = false;
        }
        callback.__requestInProgress = true;
        ensureAuth((err, token) => {
            if (err) {
                return callback(err);
            }
            //somebody called abort before the ensureAuth resolved
            if (!callback.__requestInProgress) {
                return;
            }
            didDocument.sign(token, (err, signature) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to sign token`, err));
                }

                getURL(queueName, action, signature.toString("hex"), (err, url) => {
                    if (err) {
                        return callback(err);
                    }
                    let originalCb = callback;
                    callback = $$.makeSaneCallback(callback);

                    let options = {headers: {Authorization: token}};

                    function makeRequest() {
                        let request = http.poll(url, options, connectionTimeout, timeout);
                        originalCb.__requestInProgress = request;

                        request.then(response => response.json())
                            .then((response) => {
                                //the return value of the listing callback helps to stop the polling mechanism in case that
                                //we need to stop to listen for more messages
                                let stop = callback(undefined, response);
                                if (waitForMore && !stop) {
                                    makeRequest();
                                }
                            }).catch((err) => {
                            callback(err);
                        });
                    }

                    //somebody called abort before we arrived here
                    if (!originalCb.__requestInProgress) {
                        return;
                    }
                    makeRequest();
                })
            })
        })
    }


    this.previewMessage = (callback) => {
        consumeMessage("get", callback);
    };

    this.readMessage = (callback) => {
        consumeMessage("take", callback);
    };

    this.readAndWaitForMessages = (callback) => {
        consumeMessage("take", true, callback);
    };

    this.abort = (callback) => {
        let request = callback.__requestInProgress;
        //if we have an object it means that a http.poll request is in progress
        if (typeof request === "object") {
            request.abort();
            callback.__requestInProgress = undefined;
            delete callback.__requestInProgress;
            console.log("A request was aborted programmatically");
        } else {
            //if we have true value it means that an ensureAuth is in progress
            if (request) {
                callback.__requestInProgress = false;
                console.log("A request was aborted programmatically");
            }
        }
    }

    this.deleteMessage = (messageID, callback) => {
        ensureAuth((err, token) => {
            if (err) {
                return callback(err);
            }
            didDocument.sign(token, (err, signature) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper(`Failed to sign token`, err));
                }

                getURL(queueName, "delete", signature.toString("hex"), messageID, (err, url) => {
                    if (err) {
                        return callback(err);
                    }

                    http.fetch(url, {
                        method: "DELETE",
                        headers: {"Authorization": token}
                    })
                        .then(response => callback())
                        .catch(e => callback(e));
                });
            });
        });
    };
}

function getMQHandlerForDID(didDocument, domain, timeout) {
    return new MQHandler(didDocument, domain, timeout);
}

module.exports = {
    send,
    getHandler,
    unsubscribe,
    getMQHandlerForDID
}