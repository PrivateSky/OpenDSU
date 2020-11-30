module.exports = function(environment){
    const config = require("./index.js");
    if(environment.vault === "server"){
        config.set("cache.vaultType","no-cache");
    }
}