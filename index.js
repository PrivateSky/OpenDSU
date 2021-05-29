/*
html API space
*/

let constants = require("./moduleConstants.js");

switch ($$.environmentType) {
    case constants.ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:
    case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
        if (typeof self !== "undefined") {
            if(!self.PREVENT_DOUBLE_LOADING_OF_OPENDSU) {
                self.PREVENT_DOUBLE_LOADING_OF_OPENDSU = {}
            }
        }
        break;
    case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
        if (typeof window !== "undefined") {
            if(!window.PREVENT_DOUBLE_LOADING_OF_OPENDSU){
                window.PREVENT_DOUBLE_LOADING_OF_OPENDSU = {}
            }
        }
        break;
    case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
    default:
        if (typeof global !== "undefined") {
            if(!global.PREVENT_DOUBLE_LOADING_OF_OPENDSU){
                global.PREVENT_DOUBLE_LOADING_OF_OPENDSU = {}
            }
        }
}

if(!PREVENT_DOUBLE_LOADING_OF_OPENDSU.INITIALISED){
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.INITIALISED = true;
    function loadApi(apiSpaceName){
        switch (apiSpaceName) {
            case "http":return require("./http"); break;
            case "crypto":return require("./crypto"); break;
            case "anchoring":return require("./anchoring"); break;
            case "contracts":return require("./contracts"); break;
            case "bricking":return require("./bricking"); break;
            case "bdns":return require("./bdns"); break;
            case "boot":return require("./boot"); break;
            case "dc":return require("./dc"); break;
            case "dt":return require("./dt"); break;
            case "keyssi":return require("./keyssi"); break;
            case "mq":return require("./mq"); break;
            case "notifications":return require("./notifications"); break;
            case "resolver":return require("./resolver"); break;
            case "sc":return require("./sc"); break;
            case "cache":return require("./cache"); break;
            case "config":return require("./config"); break;
            case "system":return require("./system"); break;
            case "db":return require("./db"); break;
            case "w3cdid":return require("./w3cdid"); break;
            case "error":return require("./error"); break;
            case "m2dsu":return require("./m2dsu"); break;
            default: throw new Error("Unknown API space " + apiSpaceName);
        }
    }

     function setGlobalVariable(name, value){
        switch ($$.environmentType) {
            case constants.ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:
            case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
                if (typeof self !== "undefined") {
                    self[name] = value;
                } else {
                    reportUserRelevantError("self not defined in Service Workers");
                }
                break;
            case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
                if (typeof window !== "undefined") {
                    window[name] = value;
                } else {
                    reportUserRelevantError("window not defined in browser environment");
                }
                break;
            case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
            default:
                if (typeof global !== "undefined") {
                    global[name] = value;
                } else {
                    reportUserRelevantError("global not defined in nodejs environment");
                }
        }
    };

    function getGlobalVariable(name){
        switch ($$.environmentType) {
            case constants.ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:
            case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
                return self[name];
            case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
                return window[name];
            case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
            default:
                return global[name];
        }
    };

    function globalVariableExists(name){
        switch ($$.environmentType) {
            case constants.ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:
            case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
                return typeof self[name] != "undefined";
            case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:
                return typeof window[name] != "undefined";
            case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
            default:
                return typeof global[name] != "undefined";
        }
    };

    PREVENT_DOUBLE_LOADING_OF_OPENDSU.loadApi = loadApi;
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.loadAPI = loadApi; //upper case version just
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.globalVariableExists = setGlobalVariable;
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.setGlobalVariable = setGlobalVariable;
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.getGlobalVariable = getGlobalVariable;
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.constants = constants;
    setGlobalVariable("setGlobalVariable",setGlobalVariable);
    setGlobalVariable("getGlobalVariable",getGlobalVariable);
    setGlobalVariable("globalVariableExists",globalVariableExists);
    require("./config/autoConfig");
}
module.exports = PREVENT_DOUBLE_LOADING_OF_OPENDSU;

