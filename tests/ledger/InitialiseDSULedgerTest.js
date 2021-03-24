const PSK_NODE_PATH = "../../../../psknode";

const path = require("path");
const DEFAULT_PSK_BUNDLES_PATH = path.join(PSK_NODE_PATH, "/bundles");
const DEFAULT_SEED_PATH = "./seed";
const DEFAULT_DOMAIN = "default";

require(path.join(DEFAULT_PSK_BUNDLES_PATH, "testsRuntime"));
const testIntegration = require(path.join(PSK_NODE_PATH, "tests/util/tir"));

const dc = require("double-check");
const assert = dc.assert;

const { promisify } = require("../../utils/promise");

const opendsu = require("opendsu");
const ledger = opendsu.loadApi("ledger");
const resolver = opendsu.loadApi("resolver");
const keySSI = opendsu.loadApi("keyssi");

assert.callback(
    "initialiseDSULedgerTest test",
    async (testFinished) => {
        try {
            const folder = await promisify(dc.createTestFolder)("dsu");
            //take note that this chdir function call will affect require and write/read functions.
            process.chdir(folder);

            await promisify(testIntegration.launchApiHubTestNode)(10, folder);

            const domain = "default";

            const { dsu: mainDsu, keySSI: mainDsuKeySSI } = await createDSU(domain);

            let config = {
                seed: DEFAULT_SEED_PATH,
                domain: DEFAULT_DOMAIN,
                bundles: DEFAULT_PSK_BUNDLES_PATH,
            };

            const fs = require("fs");
            fs.writeFileSync("domain.js", "domain.js");
            fs.writeFileSync("boot-cfg.json", `{"runtimeBundles":[],"constitutionBundles":["domain.js"]}`);

            let cmds = ["addFile domain.js /constitution/domain.js",
             "addFile boot-cfg.json /boot-cfg.json"
            ]
             ;

            let dossier_builder = opendsu.loadApi("dt").getDossierBuilder();
            const constitutionKeySSI = await promisify(dossier_builder.buildDossier)(config, cmds);

            console.log(`Build process finished. constitutionKeySSI: ${constitutionKeySSI}`);

            await promisify(ledger.initialiseDSULedger)(mainDsuKeySSI, constitutionKeySSI);

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
