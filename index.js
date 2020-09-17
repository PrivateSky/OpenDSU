/*
html API space
*/

module.exports.loadApi = function(apiSpaceName){
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
        default: throw new Error("Unknown API space " + apiSpaceName);
    }
}

module.exports.constants = require("./moduleConstants.js");