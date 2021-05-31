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
            keepOnlyContractsConfigInsideDomainConfig: false,
        };
    }

    const {
        setConstitutionInConfig = true,
        setDefaultContractsDomainInEnv = false,
        keepOnlyContractsConfigInsideDomainConfig = false,
    } = options;

    try {
        const folder = await $$.promisify(dc.createTestFolder)("dsu");
        const domainsConfigPath = path.join(folder, "/external-volume/config/domains");

        let serverConfig;
        if (keepOnlyContractsConfigInsideDomainConfig) {
            // in order to keep only contracts config inside domain config file, we need to put inside serverconfig the non-contracts configs
            serverConfig = {
                endpointsConfig: {
                    anchoring: {
                        domainStrategies: {
                            contract: {
                                type: "Contract",
                                option: {
                                    path: "/external-volume/domains/contract/anchors",
                                    enableBricksLedger: false,
                                },
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
        } else {
            serverConfig = {};

            const defaultDomainConfig = {
                anchoring: {
                    type: "FS",
                    option: {
                        path: "/internal-volume/domains/default/anchors",
                        enableBricksLedger: false,
                    },
                    commands: {
                        addAnchor: "anchor",
                    },
                },
                bricking: {
                    path: "/internal-volume/domains/default/brick-storage",
                },
                bricksFabric: {
                    name: "BrickStorage",
                    option: {
                        timeout: 15000,
                        transactionsPerBlock: 5,
                    },
                },
            };

            await $$.promisify(testIntegration.storeFile)(domainsConfigPath, "default.json", JSON.stringify(defaultDomainConfig));
        }

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

        // store domain config
        let testDomainConfig;
        if (keepOnlyContractsConfigInsideDomainConfig) {
            testDomainConfig = {
                contracts: {
                    constitution: setConstitutionInConfig ? domainSeed : "",
                },
            };
        } else {
            testDomainConfig = {
                anchoring: {
                    type: "Contract",
                    option: {
                        path: "/external-volume/domains/contract/anchors",
                        enableBricksLedger: false,
                    },
                },
                bricking: {
                    path: "/external-volume/domains/contract/brick-storage",
                },

                contracts: {
                    constitution: setConstitutionInConfig ? domainSeed : "",
                },
            };
        }

        await $$.promisify(testIntegration.storeFile)(domainsConfigPath, "contract.json", JSON.stringify(testDomainConfig));

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
