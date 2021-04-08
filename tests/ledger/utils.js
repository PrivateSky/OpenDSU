const { promisify } = require("../../utils/promise");

const opendsu = require("opendsu");
const resolver = opendsu.loadApi("resolver");
const keySSI = opendsu.loadApi("keyssi");

async function createDSU(domain) {
    const keyssitemplate = keySSI.createTemplateKeySSI("seed", domain);
    const dsu = await promisify(resolver.createDSU)(keyssitemplate);
    const keySSIString = await promisify(dsu.getKeySSIAsString)();
    return { dsu, keySSI: keySSIString };
}

module.exports = {
    createDSU,
};
