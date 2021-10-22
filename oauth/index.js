const createOIDC = (options) => {
    const OIDC = require("./src/oidc/OIDC");
    return new OIDC(options);
}

module.exports = {
    createOIDC
}