require("../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require("../../resolver");
const keySSI = require("../../keyssi");
const { promisify } = require("../../utils/promise");

assert.callback(
    "getDSUHandler callApi test",
    async (testFinished) => {
        try {
            const folder = await promisify(dc.createTestFolder)("dsu");
            await promisify(testIntegration.launchApiHubTestNode)(10, folder);

            const domain = "default";

            const { dsu: dsuToMount, keySSI: dsuToMountKeySSI } = await createDSU(domain);

            const apiJsContent = `
                function dummyApiMethod(callback) {
                    callback(undefined, 'RESULT_FROM_API_JS');
                }
                module.exports = {
                    dummyApiMethod
                };
            `;
            await promisify(dsuToMount.writeFile)("api.js", apiJsContent);

            const { dsu: mainDSU, keySSI: mainDsuKeySSI } = await createDSU(domain);

            await promisify(mainDSU.mount)("/code", dsuToMountKeySSI);

            const result = await promisify(resolver.getDSUHandler(mainDsuKeySSI).callApi)("dummyApiMethod");

            assert.equal(result, "RESULT_FROM_API_JS");
            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);

async function createDSU(domain) {
    const keyssitemplate = keySSI.createTemplateKeySSI("seed", domain);
    const dsu = await promisify(resolver.createDSU)(keyssitemplate);
    const keySSIString = await promisify(dsu.getKeySSIAsString)();
    return { dsu, keySSI: keySSIString };
}
