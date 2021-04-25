require("../../../../../psknode/bundles/testsRuntime");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require("../../../resolver");
const { createTestFolderWithDSU, isHashLinkSSI } = require("./utils");

assert.callback(
    "getHandler createFolder",
    (testFinished) => {
        createTestFolderWithDSU("dsu-createFolder", (keySSI, dsu) => {
            resolver.getDSUHandler(keySSI).listFolders("/", (error, initialFolders) => {
                if (error) {
                    throw error;
                }

                resolver.getDSUHandler(keySSI).createFolder("/dummy", (error, result) => {
                    if (error) {
                        throw error;
                    }

                    assert.true(isHashLinkSSI(result), "expected result to be a HashLinkSSI");

                    resolver.getDSUHandler(keySSI).listFolders("/", (error, finalFolders) => {
                        if (error) {
                            throw error;
                        }

                        assert.true(initialFolders.indexOf("dummy") === -1);
                        assert.true(finalFolders.indexOf("dummy") !== -1);

                        testFinished();
                    });
                });
            });
        });
    },
    10000
);
