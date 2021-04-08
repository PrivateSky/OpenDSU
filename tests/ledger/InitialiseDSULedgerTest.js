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

const { createDSU } = require("./utils");

assert.callback(
    "initialiseDSULedgerTest",
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

            const dsuHandler = resolver.getDSUHandler(mainDsuKeySSI);
            const mainDsuFolders = await promisify(dsuHandler.listFolders)("/");
            console.log('mainDsuFolders', mainDsuKeySSI, mainDsuFolders)
            // check presence of mount in /code of constitutionKeySSI and /worldState, /history folders
            assert.true(mainDsuFolders.includes("worldState"));
            assert.true(mainDsuFolders.includes("history"));

            // check if constitution is properly mounted at /code
            const mountedDSUs = await promisify(dsuHandler.listMountedDSUs)("/");
            const isConstitutionMounted = mountedDSUs.some(
                (mountedDsu) => mountedDsu.path === "code" && mountedDsu.identifier === constitutionKeySSI
            );

            assert.true(isConstitutionMounted);
            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    20000
);
