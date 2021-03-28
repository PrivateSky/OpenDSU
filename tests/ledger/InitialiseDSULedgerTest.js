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
            // fs.writeFileSync("domain.js", "console.log('Loaded domain')");
            fs.writeFileSync("boot-cfg.json", `{"runtimeBundles":["pskruntime.js", "domain.js"],"constitutionBundles":[]}`);

            let cmds = [`addFile ${path.join(__dirname, 'domain.js')} /constitution/domain.js`,
            `addFile ${path.join(__dirname, DEFAULT_PSK_BUNDLES_PATH, 'pskruntime.js')} /constitution/pskruntime.js`,
                "addFile boot-cfg.json /boot-cfg.json"
            ];

            let dossier_builder = opendsu.loadApi("dt").getDossierBuilder();
            const constitutionKeySSI = await promisify(dossier_builder.buildDossier)(config, cmds);

            console.log(`Build process finished. constitutionKeySSI: ${constitutionKeySSI}`);

            await promisify(ledger.initialiseDSULedger)(mainDsuKeySSI, constitutionKeySSI);

            // check presence of mount in /code of constitutionKeySSI and /worldState, /history folders
            const dsuHandler = resolver.getDSUHandler(mainDsuKeySSI);
            const mainDsuFolders = await promisify(dsuHandler.listFolders)("/");

            assert.true(mainDsuFolders.includes("worldState"));
            assert.true(mainDsuFolders.includes("history"));

            const mountedDSUs = await promisify(dsuHandler.listMountedDSUs)("/");
            const isConstitutionMounted = mountedDSUs.some(mountedDsu => mountedDsu.path === "code" && mountedDsu.identifier === constitutionKeySSI);


            const constitutionDsuHandler = resolver.getDSUHandler(constitutionKeySSI);
            const constitutionDsuFolders = await promisify(constitutionDsuHandler.listFiles)("/constitution");
            console.log('constitutionDsuFolders', constitutionDsuFolders)

            const domainJsContent = await promisify(constitutionDsuHandler.readFile)("/constitution/domain.js");
            // console.log('domainJsContent', domainJsContent.toString())

            const dsuLedger = ledger.getDSULedger(mainDsuKeySSI);

            //     $$.blockchain.startTransactionAs("agent", "Constitution", "addAgent", agentAlias, "PublicKey");
            //     let agent = $$.blockchain.lookup("Agent", agentAlias);   
            const agentAlias = "Smoky";         
            dsuLedger.startTransaction("Constitution", "addAgent", agentAlias, "PublicKey", (error, result) => {
                if (error) {
                    throw error;
                }
                let agent = $$.promisify(dsuLedger.lookup)("Agent", agentAlias);
                console.log('###RESULT', agent.publicKey, "PublicKey");

            })

            assert.true(isConstitutionMounted);
            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    15000
);

async function createDSU(domain) {
    const keyssitemplate = keySSI.createTemplateKeySSI("seed", domain);
    const dsu = await promisify(resolver.createDSU)(keyssitemplate);
    const keySSIString = await promisify(dsu.getKeySSIAsString)();
    return { dsu, keySSI: keySSIString };
}
