require("../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../psknode/tests/util/tir");
const dc = require("double-check");

const fs = require("fs");
const path = require("path");

async function launchApiHubTestNodeWithTestDomain(options, callback) {
    if (typeof options === "function") {
        callback = options;
        options = {
            setConstitutionInConfig: true,
            setDefaultContractsDomainInEnv: false,
        };
    }

    const serverConfig = {
        endpointsConfig: {
            anchoring: {
                domainStrategies: {
                    contract: {
                        type: "Contract",
                        option: {
                            path: "/external-volume/domains/contract/anchors",
                            enableBricksLedger: false,
                        },
                        // commands: {
                        //     addAnchor: "anchor",
                        // },
                    },
                },
            },
            bricking: {
                domains: {
                    contract: {
                        path: "/external-volume/domains/contract/brick-storage",
                    },
                },
            },
            contracts: {
                domainsPath: "/external-volume/domains",
            },
        },
    };

    try {
        const folder = await $$.promisify(dc.createTestFolder)("dsu");

        await $$.promisify(testIntegration.storeServerConfig)(folder, serverConfig);
        await $$.promisify(testIntegration.launchApiHubTestNode)(10, folder);
        await $$.promisify(testIntegration.addDomainsInBDNS.bind(testIntegration))(folder, ["contract"]);

        const contractSeedPath = path.join(folder, ".contract-seed");
        const domainSeedPath = path.join(folder, ".domain-seed");

        // build contract DSU type
        await $$.promisify(testIntegration.runOctopusScript)("buildDossier", [
            `--seed=${contractSeedPath}`,
            path.resolve(__dirname, "bin/build.file"),
        ]);
        const contractSeed = fs.readFileSync(contractSeedPath, { encoding: "utf8" });
        console.log("contractSeed", contractSeed);

        // create DSU for contract
        await $$.promisify(testIntegration.runOctopusScript)("createDomain", [
            `--dsu-type-ssi=${contractSeedPath}`,
            `--seed=${domainSeedPath}`,
        ]);
        const domainSeed = fs.readFileSync(domainSeedPath, { encoding: "utf8" });
        console.log("domainSeed", domainSeed);

        const { setConstitutionInConfig = true, setDefaultContractsDomainInEnv = false } = options;

        // store domain config
        const testDomainConfig = {
            constitution: setConstitutionInConfig ? domainSeed : "",
        };
        const testDomainConfigPath = path.join(folder, "/external-volume/domains");
        await $$.promisify(testIntegration.storeFile)(
            testDomainConfigPath,
            "contract.config",
            JSON.stringify(testDomainConfig)
        );

        if (setDefaultContractsDomainInEnv) {
            process.env.PSK_APIHUB_DEFAULT_CONTRACTS_DOMAIN_SSI = domainSeed;
        }

        callback();
    } catch (error) {
        callback(error);
    }
}

module.exports = {
    launchApiHubTestNodeWithTestDomain,
};
