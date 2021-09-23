

function DemoPKDocument(identifier){
    this.sign = function(hash, callback){
        // Convert the hash to a Buffer instance in order to
        // remain compatible with the other DID document types
        hash = Buffer.from(hash);
        if (typeof callback === 'function') {
            return callback(undefined, hash);
        }
        return hash;
    };

    this.verify = function(hash, signature, callback){
        if (Buffer.isBuffer(signature)) {
            signature = signature.toString();
        }
        callback(undefined, hash == signature);
    };

    let domainName;

    this.setDomain = function(name) {
        domainName = name;
    }

    function getApiHubEndpoint() {
        return new Promise(async (resolve, reject) => {
            const opendsu = require("opendsu");
            const getBaseURL = require("../../utils/getBaseURL");
            const consts = opendsu.constants;
            const system = opendsu.loadApi("system");
            // return system.getEnvironmentVariable(consts.BDNS_ROOT_HOSTS);
            if (domainName) {
                const bdns = opendsu.loadApi('bdns');
                try {
                    let mqArray = await $$.promisify(bdns.getMQEndpoints)(domainName);
                    if (mqArray.length > 0) {
                        return resolve(mqArray[0]);
                    }
                } catch (e) {
                    resolve(getBaseURL());
                }
            }
            resolve(getBaseURL());
        });
    }

    this.sendMessage = async (message, toOtherDID, callback) => {
        const opendsu = require("opendsu");
        const http = opendsu.loadApi("http");
        let apiHubEndpoint = await getApiHubEndpoint();
        let url = `${apiHubEndpoint}/mq/send-message/${encodeURI(toOtherDID)}`;
        let options = message;

        let request = http.doPost(url, options, (err, response) => {
            if (err) {
                return callback(OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to send message`, err)));
            }

            return callback();
        });
    };

    this.readMessage = async (callback) => {
        const endpoint = await getApiHubEndpoint();
        const opendsu = require("opendsu");
        const http = opendsu.loadApi("http");
        let didIdentifier = this.getIdentifier();
        let createChannelUrl = `${endpoint}/mq/create-channel/${encodeURI(didIdentifier)}`;
        http.doPost(createChannelUrl, "", (err, response) => {
            if (err) {
                if (err.statusCode === 409) {
                    //channels already exists. no problem :D
                } else {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create channel for DID ${didIdentifier}`, err));
                }
            }

            function makeRequest() {
                let url = `${endpoint}/mq/receive-message/${encodeURI(didIdentifier)}`;
                let options = {};

                let request = http.poll(url, options);

                request.then((response) => {
                    return response.text();
                }).then((message) => {
                    return callback(undefined, message);
                }).catch((err) => {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Unable to read message`, err));
                });
            }

            makeRequest();
        });
    };

    this.getIdentifier = function(){
        return `did:demo:${identifier}`;
    }

    return this;
}

function DEMO_DIDMethod(){
    let aliasDocument = require("../proposals/aliasDocument");
    this.create = function(identifier, callback){
        callback(null, new DemoPKDocument(identifier));
    }

    this.resolve = function(tokens, callback){
        callback(null, new DemoPKDocument(tokens[2]));
    }
}

module.exports.create_demo_DIDMethod = function(){
    return new DEMO_DIDMethod();
}