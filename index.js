/*
html API space
*/

let constants = require("./moduleConstants.js");
switch ($$.environmentType) {
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

    let loadApi = function(apiSpaceName){
        switch (apiSpaceName) {
            case "http":return require("./http"); break;
            case "crypto":return require("./crypto"); break;
            case "anchoring":return require("./anchoring"); break;
            case "bricking":return require("./bricking"); break;
            case "bdns":return require("./bdns"); break;
            case "dc":return require("./dc"); break;
            case "dt":return require("./dt"); break;
            case "keyssi":return require("./keyssi"); break;
            case "mq":return require("./mq"); break;
            case "notifications":return require("./notifications"); break;
            case "resolver":return require("./resolver"); break;
            case "sc":return require("./sc"); break;
            case "cache":return require("./cache/cachedStores"); break;
            case "config":return require("./config"); break;
            case "system":return require("./system"); break;
            default: throw new Error("Unknown API space " + apiSpaceName);
        }
    }

    PREVENT_DOUBLE_LOADING_OF_OPENDSU.loadApi = loadApi;
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.loadAPI = loadApi;
    PREVENT_DOUBLE_LOADING_OF_OPENDSU.constants = constants;
    require("./config/autoConfig");

}

module.exports = PREVENT_DOUBLE_LOADING_OF_OPENDSU;