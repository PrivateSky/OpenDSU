require("../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require("../../resolver");
const { BOOT_CONFIG_FILE } = require("../../moduleConstants");
const keySSI = require("../../keyssi");

assert.callback(
    "getHandler with boot config",
    (testFinished) => {
        dc.createTestFolder("dsu", (err, folder) => {
            if (err) {
                throw err;
            }
            testIntegration.launchApiHubTestNode(10, folder, (err) => {
                if (err) {
                    throw err;
                }

                const domain = "default";
                createDSU(domain, (err, { dsu: dsuToMount, keySSI: dsuToMountKeySSI } = {}) => {
                    if (err) {
                        throw err;
                    }

                    const bootConfigContent =
                        '{"runtimeBundles":["pskruntime.js","webshims.js"],"constitutionBundles":["domain.js"]}';
                    dsuToMount.writeFile(BOOT_CONFIG_FILE, bootConfigContent, function (err) {
                        if (err) {
                            throw err;
                        }

                        createDSU(domain, (err, { dsu: mainDSU, keySSI: mainDsuKeySSI } = {}) => {
                            if (err) {
                                throw err;
                            }

                            mainDSU.mount("/code", dsuToMountKeySSI, (err) => {
                                if (err) {
                                    throw err;
                                }

                                resolver.getDSUHandler(mainDsuKeySSI).listFiles("/", (err, result) => {
                                    if (err) {
                                        throw err;
                                    }

                                    testFinished();
                                });
                            });
                        });
                    });
                });
            });
        });
    },
    10000
);

function createDSU(domain, callback) {
    const keyssitemplate = keySSI.createTemplateKeySSI("seed", domain);
    resolver.createDSU(keyssitemplate, (err, dsu) => {
        if (err) {
            return callback(err);
        }

        dsu.getKeySSIAsString((err, keySSI) => {
            if (err) {
                throw err;
            }

            callback(undefined, { dsu, keySSI });
        });
    });
}
