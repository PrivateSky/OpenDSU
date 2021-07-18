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
            bdnsHosts = bdnsHosts.replace(/\$ORIGIN/g, getBaseURL());
            bdnsCache = JSON.parse(bdnsHosts);
            isInitialized = true;
            this.executePendingCalls();
        }).catch((err) => console.log("Failed to retrieve BDNS hosts", err));
    };

    retrieveHosts();

    const getSection = (dlDomain, section, callback) => {
        function load_or_default() {
            if (typeof dlDomain === "undefined") {
                return callback(Error(`The provided domain is undefined`));
            }

            if(typeof bdnsCache[dlDomain] === "undefined"){
                return callback(Error(`The provided domain ${dlDomain} is not configured`));
            }

            const config = bdnsCache[dlDomain][section] ? bdnsCache[dlDomain][section] : [getBaseURL()];
            callback(undefined, config);
        }

        if (!isInitialized) {
            return this.addPendingCall(() => {
                if (dlDomain === undefined) {
                    return callback(new Error("The domain is not defined"));
                }
                return load_or_default();
            })
        }
        if (dlDomain === undefined) {
            return callback(new Error("The domain is not defined"));
        }
        load_or_default();
    }

    this.getRawInfo = (dlDomain, callback) => {
        if (!isInitialized) {
            return this.addPendingCall(() => {
                callback(undefined, bdnsCache[dlDomain]);
            })
        }
        callback(undefined, bdnsCache[dlDomain]);
    };

    this.getBrickStorages = (dlDomain, callback) => {
        getSection(dlDomain, "brickStorages", callback);
    };

    this.getAnchoringServices = (dlDomain, callback) => {
        getSection(dlDomain, "anchoringServices", callback);
    };

    this.getContractServices = (dlDomain, callback) => {
        getSection(dlDomain, "contractServices", callback);
    };

    this.getReplicas = (dlDomain, callback) => {
        getSection(dlDomain, "replicas", callback);
    };

    this.getNotificationEndpoints = (dlDomain, callback) => {
        getSection(dlDomain, "notifications", callback);
    }

    this.getMQEndpoints = (dlDomain, callback) => {
        getSection(dlDomain, "mqEndpoints", callback);
    }

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
