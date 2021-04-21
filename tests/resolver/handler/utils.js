require("../../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../../psknode/tests/util/tir");

const dc = require("double-check");

const resolver = require("../../../resolver");
const keySSI = require("../../../keyssi");

function createTestFolderWithDSU(folderName, callback) {
    dc.createTestFolder(folderName, (err, folder) => {
        if (err) {
            throw err;
        }
        testIntegration.launchApiHubTestNode(10, folder, (err) => {
            if (err) {
                throw err;
            }

            const domain = "default";
            createDSU(domain, (err, keySSI) => {
                if (err) {
                    throw err;
                }

                resolver.loadDSU(keySSI, (err, dsu) => {
                    if (err) {
                        throw err;
                    }
                    callback(keySSI, dsu);
                });
                return;
            });
        });
    });
}

function createDSU(domain, keySSICallback) {
    const keyssitemplate = keySSI.createTemplateKeySSI("seed", domain);
    resolver.createDSU(keyssitemplate, (err, dsu) => {
        if (err) {
            throw err;
        }

        dsu.getKeySSIAsString((err, keySSI) => {
            if (err) {
                throw err;
            }

            keySSICallback(undefined, keySSI);
        });
    });
}

function testHandlerMethod(
    { handlerMethod, handlerMethodArgs, dsuMethod, dsuMethodArgs, onCreatedDSU },
    testFinishedCallback
) {
    dc.createTestFolder("dsu", (err, folder) => {
        if (err) {
            throw err;
        }
        testIntegration.launchApiHubTestNode(10, folder, (err) => {
            if (err) {
                throw err;
            }

            const domain = "default";
            createDSU(domain, (err, keySSI) => {
                const executeDSUCommands = () => {
                    loadDSUHandlerWithDSUMethod(
                        err,
                        { keySSI, handlerMethod, handlerMethodArgs, dsuMethod, dsuMethodArgs },
                        testFinishedCallback
                    );
                };

                if (typeof onCreatedDSU === "function") {
                    resolver.loadDSU(keySSI, (err, dsu) => {
                        if (err) {
                            throw err;
                        }
                        onCreatedDSU(dsu, executeDSUCommands);
                    });
                    return;
                }

                executeDSUCommands();
            });
        });
    });
}

function loadDSUHandlerWithDSUMethod(
    err,
    { keySSI, handlerMethod, handlerMethodArgs, dsuMethod, dsuMethodArgs },
    testFinishedCallback
) {
    dsuMethod = dsuMethod || handlerMethod;
    dsuMethodArgs = dsuMethodArgs || handlerMethodArgs;
    if (err) {
        throw err;
    }
    console.log("Created DSU keySSI : ", keySSI);

    const callback = (error, handlerResponse) => {
        if (error) {
            throw error;
        }

        resolver.loadDSU(keySSI, (err, dsu) => {
            if (err) {
                throw err;
            }

            loadedDSUCallback = (error, loadedDSUResponse) => {
                if (error) {
                    throw error;
                }
                testFinishedCallback(handlerResponse, loadedDSUResponse, { dsu });
            };

            dsu[dsuMethod].apply(null, [...dsuMethodArgs, loadedDSUCallback]);
        });
    };

    resolver.getDSUHandler(keySSI)[handlerMethod].apply(null, [...dsuMethodArgs, callback]);
}

module.exports = {
    createTestFolderWithDSU,
    createDSU,
    testHandlerMethod,
};
