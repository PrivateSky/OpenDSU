const config = {};
function set(key, value) {
    config[key] = value;
}

function get(key) {
    return config[key];
}

const autoconfigFromEnvironment = require("./autoConfigFromEnvironment");
module.exports = {
    set,
    get,
    autoconfigFromEnvironment
};

