require("../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;

const contracts = require("../../contracts");

const fs = require("fs");
const path = require("path");

function runOctopusScript(scriptName, args, callback) {
    const scriptPath = path.join(
        process.env.PSK_ROOT_INSTALATION_FOLDER,
        `./node_modules/octopus/scripts/${scriptName}.js`
    );

    const pskBundlesPath = "./../../../../psknode/bundles";

    const child_process = require("child_process");
    const forkedProcess = child_process.fork(scriptPath, [`--bundles=${pskBundlesPath}`, ...args]);

    forkedProcess.on("exit", function (code) {
        if (code !== 0) {
            return callback(code);
        }

        callback(null);
    });
}

assert.callback(
    "contracts test",
    async (testFinished) => {
        try {
            const folder = await $$.promisify(dc.createTestFolder)("dsu");
            console.log("@folder", folder);
            await $$.promisify(testIntegration.launchApiHubTestNode)(10, folder);

            const contractSeedPath = path.join(folder, ".contract-seed");
            const domainSeedPath = path.join(folder, ".domain-seed");

            // build contract DSU type
            await $$.promisify(runOctopusScript)("buildDossier", [`--seed=${contractSeedPath}`]);
            const contractSeed = fs.readFileSync(contractSeedPath, { encoding: "utf8" });
            console.log("contractSeed", contractSeed);

            // create DSU for contract
            await $$.promisify(runOctopusScript)("createDomain", [
                `--dsu-type-ssi=${contractSeedPath}`,
                `--seed=${domainSeedPath}`,
            ]);
            const domainSeed = fs.readFileSync(domainSeedPath, { encoding: "utf8" });
            console.log("domainSeed", domainSeed);

            process.env.PSK_APIHUB_DEFAULT_CONTRACTS_DOMAIN_SSI = domainSeed;

            const callContractMethod = $$.promisify(contracts.callContractMethod);

            const result = await callContractMethod("default", "anchoring", "versions");
            console.log("result", result);

            testFinished();
        } catch (error) {
            console.error(error);
        }
    },
    10000
);
