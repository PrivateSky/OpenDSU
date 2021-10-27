const createOIDC = (options) => {
    const OIDC = require("./src/oidc/OIDC");
    return new OIDC(options);
}

module.exports = {
    createOIDC,
    getStorage: require("./src/util/Storage").getStorage,
    constants: require("./src/oidc/constants"),

}