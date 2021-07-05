require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require("../../../resolver");
const { createTemplateKeySSI } = require("../../../keyssi");

const { launchApiHubTestNodeWithContractAsync } = require("../utils");

assert.callback(
    "Create DSU with anchoring configuration set to use anchoring contract",
    async (testFinished) => {
        try {
            await launchApiHubTestNodeWithContractAsync();

            const keySSISeed = createTemplateKeySSI("seed", "contract");
            const dsu = await $$.promisify(resolver.createDSU)(keySSISeed);

            const hashlink = await $$.promisify(dsu.getLastHashLinkSSI)();
            const dsuKeySSI = await $$.promisify(dsu.getKeySSIAsString)();

            assert.equal(hashlink.getDLDomain(), "contract");

            const loadedDSU = await $$.promisify(resolver.loadDSU)(dsuKeySSI);
            const loadedDSUHashlink = await $$.promisify(loadedDSU.getLastHashLinkSSI)();

            assert.equal(hashlink.getIdentifier(true), loadedDSUHashlink.getIdentifier(true));

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
