const createOIDC = (issuer, client, storage) => {
    const OIDC = require("./src/oidc/OIDC");
    const options = {issuer, client, storage}
    return new OIDC(options);
}

module.exports = {
    createOIDC
}