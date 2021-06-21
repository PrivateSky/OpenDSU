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
            keepOnlyContractsConfigInsideDomainConfig: false,
        };
    }

    const { setConstitutionInConfig = true, keepOnlyContractsConfigInsideDomainConfig = false } = options;

    try {
        const folder = await $$.promisify(dc.createTestFolder)("dsu");
        const configPath = path.join(folder, "/external-volume/config");
        const domainsConfigPath = path.join(configPath, "domains");

        let serverConfig;
        let testDomainConfig;

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

            testDomainConfig = {
                contracts: {},
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
            };
        }

        await $$.promisify(testIntegration.storeServerConfig)(folder, serverConfig);

        // store domain config
        await $$.promisify(testIntegration.storeFile)(domainsConfigPath, "contract.json", JSON.stringify(testDomainConfig));

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

        process.env.PSK_APIHUB_DEFAULT_CONTRACTS_DOMAIN_SSI = domainSeed;

        const constants = require("opendsu").constants;
        const w3cDID = require("opendsu").loadApi("w3cdid");
        const validatorDID = await $$.promisify(w3cDID.createIdentity)("demo", "id");

        const contractBdnsConfig = {
            validators: [{ DID: validatorDID.getIdentifier(), URL: process.env[constants.BDNS_ROOT_HOSTS] }],
        };
        const bdnsConfigPath = path.join(configPath, "bdns");
        await $$.promisify(testIntegration.storeFile)(bdnsConfigPath, "contract.json", JSON.stringify(contractBdnsConfig));

        callback();
    } catch (error) {
        callback(error);
    }
}

module.exports = {
    launchApiHubTestNodeWithTestDomain,
};
