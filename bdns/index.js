const constants = require("../moduleConstants");
const PendingCallMixin = require("../utils/PendingCallMixin");
const getBaseURL = require("../utils/getBaseURL");
function BDNS() {
    PendingCallMixin(this);
    let bdnsCache;
    const http = require("opendsu").loadApi("http");
    let isInitialized = false;
    let retrieveHosts = () => {
        const url = `${getBaseURL()}/bdns#x-blockchain-domain-request`;
        http.fetch(url)
            .then((response) => {
                return response.json()
            }).then((bdnsHosts) => {
            bdnsHosts = JSON.stringify(bdnsHosts);
            let baseURL =  require("../utils/getBaseURL")

            bdnsHosts = bdnsHosts.replace(/\$ORIGIN/g, baseURL);
            bdnsCache = JSON.parse(bdnsHosts);
            isInitialized = true;
            this.executePendingCalls();
        }).catch((err) => console.log("Failed to retrieve BDNS hosts", err));
    };

    retrieveHosts();

    this.getRawInfo = (dlDomain, callback) => {
        if (!isInitialized) {
            return this.addPendingCall(() => {
                callback(undefined, bdnsCache[dlDomain]);
            })
        }
        callback(undefined, bdnsCache[dlDomain]);
    };

    this.getBrickStorages = (dlDomain, callback) => {
        if (!isInitialized) {
            return this.addPendingCall(() => {
                if (dlDomain === undefined){
                    callback(new Error("The domain is not defined"));
                }
                callback(undefined, bdnsCache[dlDomain].brickStorages);
            })
        }
        if (dlDomain === undefined){
            callback(new Error("The domain is not defined"));
        }
        callback(undefined, bdnsCache[dlDomain].brickStorages);
    };

    this.getAnchoringServices = (dlDomain, callback) => {
        if (!isInitialized) {
            return this.addPendingCall(() => {
                callback(undefined, bdnsCache[dlDomain].anchoringServices);
            })
        }
        if(dlDomain !== undefined){
            callback(undefined, bdnsCache[dlDomain].anchoringServices);
        } else {
            callback(new Error("undefined domain does not exist"));
        }
    };

    this.getContractServices = (dlDomain, callback) => {
        if (!isInitialized) {
            return this.addPendingCall(() => {
                callback(undefined, bdnsCache[dlDomain].contractServices);
            })
        }
        if(dlDomain !== undefined){
            callback(undefined, bdnsCache[dlDomain].contractServices);
        } else {
            callback(new Error("undefined domain does not exist"));
        }
    };

    this.getReplicas = (dlDomain, callback) => {
        if (!isInitialized) {
            return this.addPendingCall(() => {
                callback(undefined, bdnsCache[dlDomain].replicas);
            })
        }
        callback(undefined, bdnsCache[dlDomain].replicas);
    };

    this.addRawInfo = (dlDomain, rawInfo) => {
        console.warn("This function is obsolete. Doing nothing");
    };

    this.addAnchoringServices = (dlDomain, anchoringServices) => {
        console.warn("This function is obsolete. Doing nothing");
    };

    this.addBrickStorages = (dlDomain, brickStorages) => {
        console.warn("This function is obsolete. Doing nothing");
    };

    this.addReplicas = (dlDomain, replicas) => {
        console.warn("This function is obsolete. Doing nothing");
    };

    this.setBDNSHosts = (bdnsHosts) => {
        isInitialized = true;
        bdnsCache = bdnsHosts;
    }
}


module.exports = new BDNS();