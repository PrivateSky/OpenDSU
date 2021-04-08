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

const { createDSU } = require("./utils");

assert.callback(
    "SimpleTransactionLedgerTest",
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
            fs.writeFileSync(
                "boot-cfg.json",
                `{"runtimeBundles":["pskruntime.js", "domain.js"],"constitutionBundles":[]}`
            );

            const pskruntimeBundlePath = path.join(__dirname, DEFAULT_PSK_BUNDLES_PATH, "pskruntime.js");
            let cmds = [
                `addFile ${path.join(__dirname, "memory-domain.js")} /constitution/domain.js`,
                `addFile ${pskruntimeBundlePath} /constitution/pskruntime.js`,
                "addFile boot-cfg.json /boot-cfg.json",
            ];

            let dossier_builder = opendsu.loadApi("dt").getDossierBuilder();
            const constitutionKeySSI = await promisify(dossier_builder.buildDossier)(config, cmds);

            console.log(`Build process finished. constitutionKeySSI: ${constitutionKeySSI}`);

            await promisify(ledger.initialiseDSULedger)(mainDsuKeySSI, constitutionKeySSI);

            const dsuLedger = ledger.getDSULedger(mainDsuKeySSI);

            const agentAlias = "Smoky";
            dsuLedger.startTransaction("Constitution", "addAgent", agentAlias, "PublicKey", async (error, result) => {
                if (error) {
                    throw error;
                }

                assert.equal(result.alias, agentAlias);
                assert.equal(result.publicKey, "PublicKey");
                testFinished();
            });
        } catch (error) {
            console.error(error);
        }
    },
    20000
);
