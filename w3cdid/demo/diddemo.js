

function DemoPKDocument(identifier){
    let mixin =  require("../W3CDID_Mixin");
    mixin(this);

    this.sign = function(hash, callback){
        return hash;
    };

    this.verify = function(hash, signature, callback){
        callback(undefined, hash == signature);
    };

    function getApiHubEndpoint(){
        const opendsu = require("opendsu");
        const getBaseURL = require("../../utils/getBaseURL");
        const consts = opendsu.constants;
        const system = opendsu.loadApi("system");
        // return system.getEnvironmentVariable(consts.BDNS_ROOT_HOSTS);
        return getBaseURL();
    }

    this.sendMessage = (message, toOtherDID, callback) => {
        const opendsu = require("opendsu");
        const http = opendsu.loadApi("http");

        let url = `${getApiHubEndpoint()}/mq/send-message/${encodeURI(toOtherDID)}`;
        let options = message;

        let request = http.doPost(url, options, (err, response)=>{
            if(err){
                return callback(OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to send message`, err)));
            }

            return callback();
        });
    };

    this.readMessage = (callback) => {
        const endpoint = getApiHubEndpoint();
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
            function makeRequest(){
                let url = `${endpoint}/mq/receive-message/${encodeURI(didIdentifier)}`;
                let options = {};

                let request = http.poll(url, options);

                request.then((response) => {
                    return response.text();
                }).then((message)=>{
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
